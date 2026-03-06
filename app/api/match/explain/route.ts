import { NextRequest, NextResponse } from "next/server";
import { InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { getProfile } from "@/src/lib/db";
import { computeCrossTypeScore } from "@/src/similarity/cross-type-scorer";
import { getBedrockConfig, createBedrockClient } from "@/src/lib/bedrock";

export async function POST(req: NextRequest) {
  try {
    const bedrockConfig = getBedrockConfig(req.headers);
    const bedrock = createBedrockClient(bedrockConfig);

    const { school_id, product_id } = await req.json();

    if (!school_id || !product_id) {
      return NextResponse.json(
        { error: "school_id and product_id are required" },
        { status: 400 }
      );
    }

    // Fetch both profiles
    const [school, product] = await Promise.all([
      getProfile("school", school_id),
      getProfile("product", product_id),
    ]);

    if (!school || !product) {
      return NextResponse.json(
        { error: `Profile not found: ${!school ? "school " + school_id : "product " + product_id}` },
        { status: 404 }
      );
    }

    // Compute cross-type scores
    const scoreResult = computeCrossTypeScore(
      school.structured_fields || {},
      product.structured_fields || {}
    );

    const sf = school.structured_fields || {};
    const pf = product.structured_fields || {};

    const prompt = `You are an expert EdTech procurement advisor. Given a school profile and a product profile, analyze how well this product fits this school's needs.

School Profile:
- Name: ${school.entity_name}
- Phase: ${sf.phase || "Unknown"}, Type: ${sf.type || "Unknown"}
- Region: ${sf.region || "Unknown"}, Size: ${sf.size_band || "Unknown"}
- FSM Band: ${sf.fsm_band || "Unknown"} (indicator of budget constraints)
- Ofsted: ${sf.ofsted_rating || "Unknown"}
- Character: ${sf.school_character || "Unknown"}
- Tech Needs: ${sf.likely_tech_needs || "Unknown"}
- Summary: ${school.profile_text || "N/A"}

Product Profile:
- Name: ${product.entity_name}
- Category: ${pf.primary_category || "Unknown"}
- Subjects: ${JSON.stringify(pf.subjects || [])}
- Age Range: ${JSON.stringify(pf.age_range || [])}
- Purchase Model: ${pf.purchase_model || "Unknown"}
- Pedagogy: ${pf.pedagogy_style || "Unknown"}
- SEND Suitability: ${pf.send_suitability || "Unknown"}
- Value Prop: ${pf.value_proposition || "Unknown"}
- Summary: ${product.profile_text || "N/A"}

Computed Match Scores:
- Phase/Age Alignment: ${Math.round(scoreResult.breakdown.phase_age_alignment * 100)}%
- Subject Overlap: ${Math.round(scoreResult.breakdown.subject_overlap * 100)}%
- Budget Fit: ${Math.round(scoreResult.breakdown.budget_fit * 100)}%
- Pedagogy Fit: ${Math.round(scoreResult.breakdown.pedagogy_fit * 100)}%
- SEND Alignment: ${Math.round(scoreResult.breakdown.send_alignment * 100)}%

Provide your analysis as JSON with these exact fields:
{
  "fit_score": <0-100 integer>,
  "summary": "<2-3 sentence overview of the fit>",
  "strengths": ["<strength 1>", "<strength 2>", ...],
  "gaps": ["<gap or concern 1>", ...],
  "recommendation": "<actionable advice for the school>"
}

Respond ONLY with the JSON object, no other text.`;

    const command = new InvokeModelCommand({
      modelId: bedrockConfig.modelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 1024,
        temperature: 0.3,
        messages: [{ role: "user", content: prompt }],
      }),
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await bedrock.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    const text = result.content?.[0]?.text || "";

    // Parse JSON from response
    let explanation;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      explanation = jsonMatch ? JSON.parse(jsonMatch[0]) : { fit_score: 0, summary: text, strengths: [], gaps: [], recommendation: "" };
    } catch {
      explanation = { fit_score: 0, summary: text, strengths: [], gaps: [], recommendation: "" };
    }

    return NextResponse.json({
      school: { id: school_id, name: school.entity_name, structured_fields: sf },
      product: { id: product_id, name: product.entity_name, structured_fields: pf },
      scores: scoreResult,
      explanation,
    });
  } catch (e: unknown) {
    console.error("Match explain error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getBedrockConfig, createBedrockClient } from "@/src/lib/bedrock";

function makeCallClaudeWithTools(bedrock: BedrockRuntimeClient, modelId: string) {
  return async function callClaudeWithTools(
    messages: Array<{ role: string; content: string | Array<{ type: string; tool_use_id?: string; content?: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> }>,
    tools: Array<{ name: string; description: string; input_schema: Record<string, unknown> }>,
    maxTokens = 4096
  ) {
    const command = new InvokeModelCommand({
      modelId,
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: maxTokens,
        temperature: 0.3,
        messages,
        tools,
      }),
      contentType: "application/json",
      accept: "application/json",
    });

    const response = await bedrock.send(command);
    return JSON.parse(new TextDecoder().decode(response.body));
  };
}

// Define the tools Claude can use for deep analysis
const ANALYSIS_TOOLS = [
  {
    name: "get_entity_profile",
    description: "Retrieve the full profile of a school or product by type and ID",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["school", "product"] },
        entity_id: { type: "string", description: "The URN (school) or slug (product)" },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "find_similar_entities",
    description: "Find similar entities and get similarity scores with breakdown",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["school", "product"] },
        entity_id: { type: "string" },
        top: { type: "number", description: "Number of similar entities to return (default 5)" },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "compare_entities",
    description: "Compare two entities and get a detailed breakdown of their similarities and differences",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["school", "product"] },
        entity_id_a: { type: "string" },
        entity_id_b: { type: "string" },
      },
      required: ["entity_type", "entity_id_a", "entity_id_b"],
    },
  },
  {
    name: "get_graph_neighbors",
    description: "Get the graph neighborhood of an entity showing connected nodes and relationships",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["school", "product"] },
        entity_id: { type: "string" },
        depth: { type: "number", description: "Depth of traversal (1-3)" },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "find_product_recommendations",
    description: "Find the best product recommendations for a school, or best-fit schools for a product (cross-type matching using hybrid scoring)",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["school", "product"], description: "The source entity type" },
        entity_id: { type: "string", description: "The source entity ID" },
        top: { type: "number", description: "Number of recommendations to return (default 5)" },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "explain_match",
    description: "Get a detailed AI explanation of why a specific school-product pair is a good or bad match",
    input_schema: {
      type: "object" as const,
      properties: {
        school_id: { type: "string", description: "School URN" },
        product_id: { type: "string", description: "Product slug" },
      },
      required: ["school_id", "product_id"],
    },
  },
  {
    name: "find_peer_insights",
    description: "Find peer schools similar to a given school and discover what products they match with. Provides social proof insights like 'schools like yours use these products'.",
    input_schema: {
      type: "object" as const,
      properties: {
        school_id: { type: "string", description: "School URN to find peers for" },
      },
      required: ["school_id"],
    },
  },
];

// Execute tool calls against our own APIs
async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  baseUrl: string,
  awsHeaders: Record<string, string> = {}
): Promise<string> {
  try {
    let url: string;
    switch (toolName) {
      case "get_entity_profile":
        url = `${baseUrl}/api/profiles/${input.entity_type}/${input.entity_id}`;
        break;
      case "find_similar_entities":
        url = `${baseUrl}/api/similar/${input.entity_type}/${input.entity_id}?top=${input.top || 5}`;
        break;
      case "compare_entities": {
        // Fetch both profiles for comparison
        const [a, b] = await Promise.all([
          fetch(`${baseUrl}/api/profiles/${input.entity_type}/${input.entity_id_a}`).then(r => r.json()),
          fetch(`${baseUrl}/api/profiles/${input.entity_type}/${input.entity_id_b}`).then(r => r.json()),
        ]);
        return JSON.stringify({ profile_a: a.profile, profile_b: b.profile });
      }
      case "get_graph_neighbors":
        url = `${baseUrl}/api/graph/neighbors/${input.entity_type}/${input.entity_id}?depth=${input.depth || 2}`;
        break;
      case "find_product_recommendations":
        url = `${baseUrl}/api/match/recommend?type=${input.entity_type}&id=${input.entity_id}&top=${input.top || 5}`;
        break;
      case "explain_match": {
        const explainRes = await fetch(`${baseUrl}/api/match/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...awsHeaders },
          body: JSON.stringify({ school_id: input.school_id, product_id: input.product_id }),
        });
        return JSON.stringify(await explainRes.json());
      }
      case "find_peer_insights": {
        const peerRes = await fetch(`${baseUrl}/api/match/peers?school_id=${input.school_id}`);
        return JSON.stringify(await peerRes.json());
      }
      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }

    const res = await fetch(url!);
    const data = await res.json();
    return JSON.stringify(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return JSON.stringify({ error: msg });
  }
}

export async function POST(req: NextRequest) {
  try {
    const bedrockConfig = getBedrockConfig(req.headers);
    const bedrock = createBedrockClient(bedrockConfig);
    const callClaudeWithTools = makeCallClaudeWithTools(bedrock, bedrockConfig.modelId);

    // Extract AWS headers to forward to internal API calls
    const awsHeaders: Record<string, string> = {};
    for (const key of ["x-aws-access-key-id", "x-aws-secret-access-key", "x-aws-region", "x-bedrock-model-id"]) {
      const val = req.headers.get(key);
      if (val) awsHeaders[key] = val;
    }

    const { query, entityType, entityId } = await req.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const baseUrl = req.nextUrl.origin;

    // Build the analysis prompt
    const systemContext = entityType && entityId
      ? `The user is looking at a ${entityType} with ID "${entityId}". Focus your analysis on this entity.`
      : "";

    const userMessage = `${systemContext}

You are an expert EdTech analyst AI. The user has asked you to analyze profile matching data. You have tools to look up entity profiles, find similar entities, compare entities, explore the graph, find cross-type product recommendations for schools (and vice versa), and get detailed AI match explanations for school-product pairs.

Your analysis should:
1. Use the available tools to gather data
2. Provide deep reasoning about WHY entities match or don't match
3. Highlight the most important matching factors
4. Identify keyword themes that connect entities
5. Give actionable insights

Format your final response with clear sections using markdown. Include:
- **Key Findings**: The most important insights
- **Matching Factors**: Why these entities are similar (with specific field values)
- **Keywords**: Important terms/themes that connect the entities
- **Graph Insights**: What the relationship graph reveals
- **Recommendation**: Actionable next steps

User query: ${query}`;

    // Agentic loop: let Claude use tools
    const messages: Array<{ role: string; content: string | Array<{ type: string; tool_use_id?: string; content?: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> }> = [
      { role: "user", content: userMessage },
    ];
    const reasoningSteps: Array<{
      type: string;
      tool?: string;
      input?: Record<string, unknown>;
      result_summary?: string;
      text?: string;
    }> = [];

    let maxIterations = 6;
    let finalResponse = "";

    while (maxIterations > 0) {
      maxIterations--;

      const response = await callClaudeWithTools(messages, ANALYSIS_TOOLS);

      // Process the response content
      const assistantContent: Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }> = [];
      let hasToolUse = false;

      for (const block of response.content) {
        if (block.type === "text") {
          assistantContent.push({ type: "text", text: block.text });
          finalResponse = block.text;
          reasoningSteps.push({ type: "thinking", text: block.text });
        } else if (block.type === "tool_use") {
          hasToolUse = true;
          assistantContent.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: block.input,
          });

          // Log the tool call as a reasoning step
          reasoningSteps.push({
            type: "tool_call",
            tool: block.name,
            input: block.input,
          });
        }
      }

      messages.push({ role: "assistant", content: assistantContent });

      if (!hasToolUse || response.stop_reason === "end_turn") {
        break;
      }

      // Execute all tool calls and add results
      const toolResults: Array<{ type: string; tool_use_id: string; content: string }> = [];
      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input, baseUrl, awsHeaders);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });

          // Summarize the result for the reasoning steps
          const parsed = JSON.parse(result);
          let summary = "";
          if (block.name === "get_entity_profile") {
            summary = parsed.profile
              ? `Found profile: ${parsed.profile.entity_name}`
              : "Profile not found";
          } else if (block.name === "find_similar_entities") {
            summary = `Found ${(parsed.similar || []).length} similar entities`;
          } else if (block.name === "compare_entities") {
            summary = `Compared ${parsed.profile_a?.entity_name || "?"} vs ${parsed.profile_b?.entity_name || "?"}`;
          } else if (block.name === "get_graph_neighbors") {
            summary = `Found ${(parsed.nodes || []).length} nodes, ${(parsed.links || []).length} edges`;
          } else if (block.name === "find_product_recommendations") {
            summary = `Found ${(parsed.recommendations || []).length} cross-type recommendations`;
          } else if (block.name === "explain_match") {
            summary = parsed.explanation
              ? `Match explanation: fit score ${parsed.explanation.fit_score}/100`
              : "Match explanation generated";
          } else if (block.name === "find_peer_insights") {
            summary = `Found ${parsed.peer_count || 0} peer schools, ${(parsed.popular_products || []).length} popular products`;
          }

          reasoningSteps.push({
            type: "tool_result",
            tool: block.name,
            result_summary: summary,
          });
        }
      }

      messages.push({ role: "user", content: toolResults });
    }

    return NextResponse.json({
      analysis: finalResponse,
      reasoning_steps: reasoningSteps,
    });
  } catch (e: unknown) {
    console.error("Analysis error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

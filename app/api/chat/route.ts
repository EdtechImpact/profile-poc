import { NextRequest } from "next/server";
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Tool = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessageParam = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ContentBlock = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolResultBlockParam = any;
import { getBedrockConfig } from "@/src/lib/bedrock";
import { SYSTEM_PROMPT } from "@/src/lib/agent-prompts";
import {
  createThread,
  addMessage,
  getMessages,
  getThread,
  updateThreadTitle,
  getProfile,
  getProductAlternatives,
  getEducationalImpact,
  saveMatchReport,
} from "@/src/lib/db";
// eslint-disable-next-line @typescript-eslint/no-require-imports
import { computeCrossTypeScore } from "@/src/similarity/cross-type-scorer";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// ─── Tool Definitions ────────────────────────────────────────────────────────

const TOOLS: Tool[] = [
  {
    name: "get_entity_profile",
    description: "Retrieve the full profile of a school or product by type and ID. Returns structured fields, profile text, and metadata.",
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
    description: "Find similar entities (same type) with similarity scores and breakdown. Uses hybrid scoring: structured + embedding + graph.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["school", "product"] },
        entity_id: { type: "string" },
        top: { type: "number", description: "Number of results (default 5)" },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "compare_entities",
    description: "Compare two entities of the same type side by side. Returns both profiles for detailed comparison.",
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
    description: "Get the knowledge graph neighborhood of an entity. Shows connected nodes (Phase, Region, Trust, Category, Subject) and relationships.",
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
    description: "Find the best product recommendations for a school, or best-fit schools for a product. Uses 7-dimension cross-type matching (phase-age, subjects, budget, pedagogy, SEND, sixth form, impact alignment). Returns ranked list with score breakdowns.",
    input_schema: {
      type: "object" as const,
      properties: {
        entity_type: { type: "string", enum: ["school", "product"], description: "Source entity type" },
        entity_id: { type: "string", description: "Source entity ID" },
        top: { type: "number", description: "Number of recommendations (default 5)" },
      },
      required: ["entity_type", "entity_id"],
    },
  },
  {
    name: "explain_match",
    description: "Get a detailed AI explanation of why a specific school-product pair matches or doesn't match. Returns fit score, strengths, gaps, and recommendation.",
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
    description: "Find peer schools similar to a given school and discover what products they match with. Provides social proof: 'schools like yours use these products'.",
    input_schema: {
      type: "object" as const,
      properties: {
        school_id: { type: "string", description: "School URN to find peers for" },
      },
      required: ["school_id"],
    },
  },
  {
    name: "get_product_alternatives",
    description: "Get known product alternatives for a given product. Returns alternative products with their categories and impact scores. Useful for broadening recommendations or finding competing products.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_id: { type: "string", description: "Product slug" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "get_educational_impact",
    description: "Get a product's educational impact scores across 5 evidence-based dimensions: Build Student Knowledge, Improve Attainment, Improve Teaching Efficiency, Reduce Teacher Workload, Improve Teacher Knowledge. Scores are percentages (0-100).",
    input_schema: {
      type: "object" as const,
      properties: {
        product_id: { type: "string", description: "Product slug" },
      },
      required: ["product_id"],
    },
  },
  {
    name: "compare_impact_scores",
    description: "Compare educational impact scores of 2 or more products side by side. Shows which product excels in which dimension.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of product slugs to compare (2-5 products)",
        },
      },
      required: ["product_ids"],
    },
  },
  {
    name: "generate_match_report",
    description: "Generate a comprehensive, evidence-backed match report for a school. Finds top product recommendations, gathers impact scores, alternatives, and peer data, then produces a structured report. Returns the report and stores it for later retrieval.",
    input_schema: {
      type: "object" as const,
      properties: {
        school_id: { type: "string", description: "School URN" },
        top: { type: "number", description: "Number of products to include (default 5)" },
      },
      required: ["school_id"],
    },
  },
  {
    name: "visualize_match",
    description: "Visualize WHY a school-product pair matches. Returns structured connection data across 7 matching dimensions (phase-age, subjects, budget, pedagogy, SEND, sixth form, impact) rendered as a visual match map in the UI. Use this after finding recommendations to show the match visually instead of explaining in text.",
    input_schema: {
      type: "object" as const,
      properties: {
        school_id: { type: "string", description: "School URN" },
        product_id: { type: "string", description: "Product slug" },
      },
      required: ["school_id", "product_id"],
    },
  },
];

// ─── Tool Execution ──────────────────────────────────────────────────────────

async function executeTool(
  toolName: string,
  input: Record<string, unknown>,
  baseUrl: string,
  awsHeaders: Record<string, string>,
  threadId: string | null
): Promise<string> {
  try {
    switch (toolName) {
      case "get_entity_profile": {
        const profile = await getProfile(input.entity_type as string, input.entity_id as string);
        if (!profile) return JSON.stringify({ error: "Profile not found" });
        return JSON.stringify({
          entity_id: profile.entity_id,
          entity_name: profile.entity_name,
          entity_type: profile.entity_type,
          structured_fields: profile.structured_fields,
          profile_text: profile.profile_text,
        });
      }

      case "find_similar_entities": {
        const url = `${baseUrl}/api/similar/${input.entity_type}/${input.entity_id}?top=${input.top || 5}`;
        const res = await fetch(url);
        return JSON.stringify(await res.json());
      }

      case "compare_entities": {
        const [a, b] = await Promise.all([
          getProfile(input.entity_type as string, input.entity_id_a as string),
          getProfile(input.entity_type as string, input.entity_id_b as string),
        ]);
        return JSON.stringify({
          profile_a: a ? { entity_name: a.entity_name, structured_fields: a.structured_fields, profile_text: a.profile_text } : null,
          profile_b: b ? { entity_name: b.entity_name, structured_fields: b.structured_fields, profile_text: b.profile_text } : null,
        });
      }

      case "get_graph_neighbors": {
        const url = `${baseUrl}/api/graph/neighbors/${input.entity_type}/${input.entity_id}?depth=${input.depth || 2}`;
        const res = await fetch(url);
        return JSON.stringify(await res.json());
      }

      case "find_product_recommendations": {
        const url = `${baseUrl}/api/match/recommend?type=${input.entity_type}&id=${input.entity_id}&top=${input.top || 5}`;
        const res = await fetch(url);
        return JSON.stringify(await res.json());
      }

      case "explain_match": {
        const res = await fetch(`${baseUrl}/api/match/explain`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...awsHeaders },
          body: JSON.stringify({ school_id: input.school_id, product_id: input.product_id }),
        });
        return JSON.stringify(await res.json());
      }

      case "find_peer_insights": {
        const res = await fetch(`${baseUrl}/api/match/peers?school_id=${input.school_id}`);
        return JSON.stringify(await res.json());
      }

      case "get_product_alternatives": {
        const alternatives = await getProductAlternatives(input.product_id as string);
        // Also get alternatives from graph
        let graphAlts: unknown[] = [];
        try {
          const { getProductAlternatives: getGraphAlts } = await import("@/src/lib/neo4j");
          graphAlts = await getGraphAlts(input.product_id as string);
        } catch { /* graph may be unavailable */ }
        return JSON.stringify({
          product_id: input.product_id,
          db_alternatives: alternatives,
          graph_alternatives: graphAlts,
          total: alternatives.length + (graphAlts as unknown[]).length,
        });
      }

      case "get_educational_impact": {
        const impact = await getEducationalImpact(input.product_id as string);
        if (!impact) {
          // Try getting from profile structured_fields
          const profile = await getProfile("product", input.product_id as string);
          const embedded = profile?.structured_fields?.educational_impact;
          if (embedded) return JSON.stringify({ product_id: input.product_id, ...embedded, source: "profile" });
          return JSON.stringify({ product_id: input.product_id, error: "No impact data available" });
        }
        const toNum = (v: unknown) => v != null ? Number(v) : null;
        return JSON.stringify({
          product_id: input.product_id,
          build_student_knowledge: toNum(impact.build_student_knowledge),
          improve_attainment: toNum(impact.improve_attainment),
          improve_teaching_efficiency: toNum(impact.improve_teaching_efficiency),
          reduce_teacher_workload: toNum(impact.reduce_teacher_workload),
          improve_teacher_knowledge: toNum(impact.improve_teacher_knowledge),
        });
      }

      case "compare_impact_scores": {
        const ids = input.product_ids as string[];
        const results = await Promise.all(
          ids.map(async (id) => {
            const impact = await getEducationalImpact(id);
            const profile = await getProfile("product", id);
            return {
              product_id: id,
              product_name: profile?.entity_name || id,
              impact: impact ? {
                build_student_knowledge: impact.build_student_knowledge,
                improve_attainment: impact.improve_attainment,
                improve_teaching_efficiency: impact.improve_teaching_efficiency,
                reduce_teacher_workload: impact.reduce_teacher_workload,
                improve_teacher_knowledge: impact.improve_teacher_knowledge,
              } : (profile?.structured_fields?.educational_impact || null),
            };
          })
        );
        return JSON.stringify({ comparisons: results });
      }

      case "generate_match_report": {
        const schoolId = input.school_id as string;
        const top = (input.top as number) || 5;

        // Fetch school profile
        const school = await getProfile("school", schoolId);
        if (!school) return JSON.stringify({ error: "School not found" });

        // Get recommendations
        const recUrl = `${baseUrl}/api/match/recommend?type=school&id=${schoolId}&top=${top}`;
        const recRes = await fetch(recUrl);
        const recData = await recRes.json();
        const recommendations = recData.recommendations || [];

        // Enrich each recommendation with impact and alternatives
        const enriched = await Promise.all(
          recommendations.map(async (rec: Record<string, unknown>, idx: number) => {
            const productId = rec.entity_id as string;
            const impact = await getEducationalImpact(productId);
            const alts = await getProductAlternatives(productId);
            return {
              rank: idx + 1,
              product: {
                id: productId,
                name: rec.entity_name,
                category: (rec as Record<string, Record<string, unknown>>).structured_fields?.primary_category,
              },
              match_score: rec.match_score,
              score_breakdown: rec.score_breakdown,
              impact_scores: impact ? {
                build_student_knowledge: impact.build_student_knowledge,
                improve_attainment: impact.improve_attainment,
                improve_teaching_efficiency: impact.improve_teaching_efficiency,
                reduce_teacher_workload: impact.reduce_teacher_workload,
                improve_teacher_knowledge: impact.improve_teacher_knowledge,
              } : null,
              alternatives: alts.map((a: Record<string, unknown>) => a.alternative_product_id || a.entity_name),
            };
          })
        );

        const report = {
          school: {
            id: schoolId,
            name: school.entity_name,
            profile_summary: school.profile_text,
          },
          recommendations: enriched,
          methodology: "Hybrid 7-dimension cross-type matching (structured 40% + embedding 30% + graph 30%) with educational impact alignment",
          generated_at: new Date().toISOString(),
        };

        // Store the report
        if (threadId) {
          try {
            const saved = await saveMatchReport(threadId, schoolId, report);
            (report as Record<string, unknown>).report_id = saved.id;
          } catch { /* report storage is best-effort */ }
        }

        return JSON.stringify(report);
      }

      case "visualize_match": {
        const schoolProfile = await getProfile("school", input.school_id as string);
        const productProfile = await getProfile("product", input.product_id as string);
        if (!schoolProfile) return JSON.stringify({ error: "School not found" });
        if (!productProfile) return JSON.stringify({ error: "Product not found" });

        const schoolFields = schoolProfile.structured_fields || {};
        const productFields = productProfile.structured_fields || {};
        const { total, breakdown } = computeCrossTypeScore(schoolFields, productFields);

        // Dimension-to-attribute mapping
        const dimensionMap: Record<string, { school_attr: string; school_key: string; product_attr: string; product_key: string }> = {
          phase_age_alignment: { school_attr: "Phase", school_key: "phase", product_attr: "Age Range", product_key: "age_range" },
          subject_overlap: { school_attr: "Tech Needs", school_key: "likely_tech_needs", product_attr: "Subjects", product_key: "subjects" },
          budget_fit: { school_attr: "FSM Band", school_key: "fsm_band", product_attr: "Purchase Model", product_key: "purchase_model" },
          pedagogy_fit: { school_attr: "School Character", school_key: "school_character", product_attr: "Pedagogy Style", product_key: "pedagogy_style" },
          send_alignment: { school_attr: "Type", school_key: "type", product_attr: "SEND Suitability", product_key: "send_suitability" },
          sixth_form_alignment: { school_attr: "Sixth Form", school_key: "has_sixth_form", product_attr: "Age Range (16+)", product_key: "age_range" },
          impact_alignment: { school_attr: "Tech Needs", school_key: "likely_tech_needs", product_attr: "Educational Impact", product_key: "educational_impact" },
        };

        const connections = Object.entries(breakdown).map(([dimension, score]) => {
          const map = dimensionMap[dimension] || { school_attr: dimension, school_key: dimension, product_attr: dimension, product_key: dimension };
          const schoolVal = schoolFields[map.school_key];
          const productVal = productFields[map.product_key];

          const formatVal = (v: unknown): string => {
            if (v == null) return "N/A";
            if (Array.isArray(v)) return v.join(", ");
            if (typeof v === "object") {
              // For educational_impact, show the top dimension
              const entries = Object.entries(v as Record<string, unknown>).filter(([, val]) => val != null && typeof val === "number");
              if (entries.length > 0) {
                entries.sort((a, b) => (b[1] as number) - (a[1] as number));
                return `${entries[0][0].replace(/_/g, " ")}: ${entries[0][1]}%`;
              }
              return JSON.stringify(v);
            }
            return String(v);
          };

          return {
            school_attr: map.school_attr,
            school_val: formatVal(schoolVal),
            product_attr: map.product_attr,
            product_val: formatVal(productVal),
            score: Math.round((score as number) * 100) / 100,
            dimension,
          };
        });

        return JSON.stringify({
          school: { name: schoolProfile.entity_name, id: input.school_id },
          product: { name: productProfile.entity_name, id: input.product_id },
          connections,
          total_score: Math.round(total * 100) / 100,
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return JSON.stringify({ error: msg });
  }
}

// ─── SSE Helpers ─────────────────────────────────────────────────────────────

function encode(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

// ─── POST Handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { thread_id, message, entity_context } = body;

  if (!message || typeof message !== "string") {
    return new Response(JSON.stringify({ error: "Message is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get Bedrock config
  let bedrockConfig;
  try {
    bedrockConfig = getBedrockConfig(req.headers);
  } catch {
    return new Response(JSON.stringify({ error: "AWS credentials not configured" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const baseUrl = req.nextUrl.origin;
  const awsHeaders: Record<string, string> = {};
  for (const key of ["x-aws-access-key-id", "x-aws-secret-access-key", "x-aws-region", "x-bedrock-model-id"]) {
    const val = req.headers.get(key);
    if (val) awsHeaders[key] = val;
  }

  const textEncoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const enqueue = (data: object) => {
        controller.enqueue(textEncoder.encode(encode(data)));
      };

      try {
        // Create or get thread
        let currentThreadId = thread_id;
        if (!currentThreadId) {
          const thread = await createThread(null, entity_context);
          currentThreadId = thread.id;
        }
        enqueue({ type: "thread_id", thread_id: currentThreadId });

        // Save user message
        await addMessage(currentThreadId, "user", message);

        // Auto-title thread on first message
        const thread = await getThread(currentThreadId);
        if (!thread?.title) {
          const title = message.length > 60 ? message.substring(0, 57) + "..." : message;
          await updateThreadTitle(currentThreadId, title);
        }

        // Load conversation history
        const history = await getMessages(currentThreadId);
        const anthropicMessages: MessageParam[] = [];

        for (const msg of history) {
          if (msg.role === "user") {
            anthropicMessages.push({ role: "user", content: msg.content || "" });
          } else if (msg.role === "assistant") {
            if (msg.tool_calls) {
              // Reconstruct assistant message with tool_use blocks
              const content: ContentBlock[] = [];
              if (msg.content) content.push({ type: "text", text: msg.content });
              for (const tc of msg.tool_calls) {
                content.push({
                  type: "tool_use",
                  id: tc.id,
                  name: tc.name,
                  input: tc.input,
                });
              }
              anthropicMessages.push({ role: "assistant", content });
            } else {
              anthropicMessages.push({ role: "assistant", content: msg.content || "" });
            }
          } else if (msg.role === "tool_result") {
            // Reconstruct tool results
            const results: ToolResultBlockParam[] = (msg.tool_results || []).map(
              (tr: { tool_use_id: string; content: string }) => ({
                type: "tool_result" as const,
                tool_use_id: tr.tool_use_id,
                content: tr.content,
              })
            );
            anthropicMessages.push({ role: "user", content: results });
          }
        }

        // Create Anthropic Bedrock client
        const client = new AnthropicBedrock({
          awsAccessKey: bedrockConfig.accessKeyId,
          awsSecretKey: bedrockConfig.secretAccessKey,
          awsRegion: bedrockConfig.region,
        });

        const modelId = bedrockConfig.modelId.includes("anthropic.")
          ? bedrockConfig.modelId
          : `anthropic.${bedrockConfig.modelId}`;

        // Agentic loop with streaming
        let continueLoop = true;
        let currentMessages = [...anthropicMessages];
        let iterations = 0;
        const maxIterations = 8;

        while (continueLoop && iterations < maxIterations) {
          iterations++;

          const msgStream = client.messages.stream({
            model: modelId,
            max_tokens: 8192,
            system: SYSTEM_PROMPT,
            messages: currentMessages,
            tools: TOOLS,
            temperature: 0.3,
          });

          // Stream events to client
          const blockTypes: Record<number, string> = {};

          for await (const event of msgStream) {
            const ev = event as unknown as Record<string, unknown>;

            if (ev.type === "content_block_start") {
              const block = ev.content_block as Record<string, unknown>;
              const blockType = block?.type as string;
              const blockIdx = ev.index as number;
              blockTypes[blockIdx] = blockType;
              if (blockType === "thinking") enqueue({ type: "thinking_start" });
            } else if (ev.type === "content_block_delta") {
              const delta = ev.delta as Record<string, unknown>;
              if (delta?.type === "thinking_delta") {
                enqueue({ type: "thinking_delta", content: delta.thinking as string });
              } else if (delta?.type === "text_delta") {
                enqueue({ type: "text_delta", content: delta.text as string });
              }
            } else if (ev.type === "content_block_stop") {
              const blockIdx = ev.index as number;
              if (blockTypes[blockIdx] === "thinking") enqueue({ type: "thinking_end" });
            }
          }

          const finalMessage = await msgStream.finalMessage();

          // Process tool calls
          const toolResultBlocks: ToolResultBlockParam[] = [];
          const toolCallsForDb: Array<{ id: string; name: string; input: unknown }> = [];
          let assistantText = "";

          for (const block of finalMessage.content) {
            if (block.type === "text") {
              assistantText += block.text;
            } else if (block.type === "tool_use") {
              toolCallsForDb.push({ id: block.id, name: block.name, input: block.input });

              enqueue({
                type: "tool_call",
                id: block.id,
                name: block.name,
                input: block.input as Record<string, unknown>,
              });

              // Execute tool
              const result = await executeTool(
                block.name,
                block.input as Record<string, unknown>,
                baseUrl,
                awsHeaders,
                currentThreadId
              );

              // Summarize and extract visual data for UI
              let summary = "";
              let visualData: Record<string, unknown> | null = null;
              try {
                const parsed = JSON.parse(result);
                if (block.name === "get_entity_profile") {
                  summary = parsed.entity_name ? `Profile: ${parsed.entity_name}` : "Profile not found";
                  if (parsed.entity_name) visualData = { entity_name: parsed.entity_name, entity_type: parsed.entity_type, structured_fields: parsed.structured_fields };
                } else if (block.name === "find_similar_entities") {
                  summary = `Found ${(parsed.similar || []).length} similar entities`;
                  visualData = parsed;
                } else if (block.name === "find_product_recommendations") {
                  summary = `Found ${(parsed.recommendations || []).length} recommendations`;
                  visualData = parsed;
                } else if (block.name === "get_product_alternatives") {
                  summary = `Found ${parsed.total || 0} alternatives`;
                  visualData = parsed;
                } else if (block.name === "get_educational_impact") {
                  summary = parsed.error ? "No impact data" : `Impact scores retrieved`;
                  if (!parsed.error) visualData = parsed;
                } else if (block.name === "compare_impact_scores") {
                  summary = `Compared ${(parsed.comparisons || []).length} products`;
                  visualData = parsed;
                } else if (block.name === "generate_match_report") {
                  summary = `Report generated with ${(parsed.recommendations || []).length} products`;
                  visualData = parsed;
                } else if (block.name === "explain_match") {
                  summary = parsed.explanation?.fit_score ? `Fit score: ${parsed.explanation.fit_score}/100` : "Explanation generated";
                  visualData = parsed;
                } else if (block.name === "find_peer_insights") {
                  summary = `${parsed.peer_count || 0} peers, ${(parsed.popular_products || []).length} popular products`;
                  visualData = parsed;
                } else if (block.name === "visualize_match") {
                  summary = parsed.error ? "Match visualization failed" : `Match map: ${parsed.school?.name} → ${parsed.product?.name} (${Math.round((parsed.total_score || 0) * 100)}%)`;
                  if (!parsed.error) visualData = parsed;
                } else {
                  summary = "Result received";
                }
              } catch { summary = "Result received"; }

              enqueue({ type: "tool_result", id: block.id, name: block.name, summary, data: visualData });

              toolResultBlocks.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: result,
              });
            }
          }

          // Save assistant message
          await addMessage(
            currentThreadId,
            "assistant",
            assistantText || null,
            toolCallsForDb.length > 0 ? toolCallsForDb : null,
            null,
            null
          );

          // Save tool results if any
          if (toolResultBlocks.length > 0) {
            await addMessage(
              currentThreadId,
              "tool_result",
              null,
              null,
              toolResultBlocks.map(tr => ({
                tool_use_id: tr.tool_use_id,
                content: typeof tr.content === "string" ? tr.content : JSON.stringify(tr.content),
              })),
              null
            );
          }

          // Continue or stop
          if (finalMessage.stop_reason === "end_turn") {
            continueLoop = false;
          } else if (finalMessage.stop_reason === "tool_use") {
            currentMessages = [
              ...currentMessages,
              { role: "assistant", content: finalMessage.content },
              { role: "user", content: toolResultBlocks },
            ];
          } else {
            continueLoop = false;
          }
        }

        enqueue({ type: "done", thread_id: currentThreadId });
      } catch (error) {
        console.error("Chat error:", error);
        const msg = error instanceof Error ? error.message : "Unknown error";
        enqueue({ type: "error", error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

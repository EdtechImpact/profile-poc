import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import "dotenv/config";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "eu-west-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

export async function callClaude(prompt, { maxTokens = 1024, temperature = 0.2 } = {}) {
  const command = new InvokeModelCommand({
    modelId: MODEL_ID,
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: "user", content: prompt }],
    }),
    contentType: "application/json",
    accept: "application/json",
  });

  const response = await bedrock.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));
  return body.content[0].text;
}

export async function extractFieldsWithLLM(rawData, llmFields) {
  const fieldPrompts = Object.entries(llmFields)
    .map(([name, field]) => `- ${name}: ${field.prompt}`)
    .join("\n");

  const prompt = `You are a data profiling assistant. Given the raw data below, extract the requested fields.

Raw data:
${JSON.stringify(rawData, null, 2)}

Extract these fields:
${fieldPrompts}

Return ONLY a valid JSON object with the field names as keys. No explanation, no markdown, just the JSON object.`;

  const responseText = await callClaude(prompt);

  // Parse JSON from response, handling possible markdown wrapping
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Failed to parse LLM response:", responseText);
    return {};
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("JSON parse error:", e.message, responseText);
    return {};
  }
}

export async function generateProfileText(entityType, entityName, structuredFields, rawData) {
  const prompt = `You are a data profiling assistant. Generate a concise natural language profile summary for this ${entityType}.

Entity name: ${entityName}
Structured profile fields: ${JSON.stringify(structuredFields, null, 2)}
${rawData ? `Additional raw data: ${JSON.stringify(rawData, null, 2).substring(0, 2000)}` : ""}

Write a 2-4 sentence profile summary that captures the key characteristics of this ${entityType}. Focus on attributes that would be useful for finding similar ${entityType}s. Be factual and concise.

Return ONLY the profile text, no explanation or formatting.`;

  return callClaude(prompt, { maxTokens: 300 });
}

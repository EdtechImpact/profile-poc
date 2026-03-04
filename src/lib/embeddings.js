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

export async function createEmbedding(text) {
  const cleanText = text.substring(0, 8000).trim();
  if (!cleanText) throw new Error("Empty text for embedding");

  const command = new InvokeModelCommand({
    modelId: "amazon.titan-embed-text-v2:0",
    body: JSON.stringify({ inputText: cleanText }),
    contentType: "application/json",
    accept: "application/json",
  });

  const response = await bedrock.send(command);
  const body = JSON.parse(new TextDecoder().decode(response.body));

  if (!Array.isArray(body.embedding)) {
    throw new Error(`Invalid embedding response: ${typeof body.embedding}`);
  }

  return body.embedding;
}

export async function createEmbeddings(texts, batchSize = 5) {
  const results = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((text) => createEmbedding(text))
    );

    for (const result of batchResults) {
      results.push(result.status === "fulfilled" ? result.value : null);
    }

    // Rate limit between batches
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log(
      `  Embeddings: ${Math.min(i + batchSize, texts.length)}/${texts.length}`
    );
  }

  return results;
}

export function calculateCosineSimilarity(vec1, vec2) {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 0;

  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;

  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

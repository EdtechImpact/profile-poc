import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";

interface BedrockConfig {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  modelId: string;
}

export function getBedrockConfig(headers: Headers): BedrockConfig {
  const accessKeyId = headers.get("x-aws-access-key-id") || process.env.AWS_ACCESS_KEY_ID || "";
  const secretAccessKey = headers.get("x-aws-secret-access-key") || process.env.AWS_SECRET_ACCESS_KEY || "";
  const region = headers.get("x-aws-region") || process.env.AWS_REGION || "eu-west-1";
  const modelId = headers.get("x-bedrock-model-id") || process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307-v1:0";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured. Please set your AWS Bedrock credentials in Settings.");
  }

  return { accessKeyId, secretAccessKey, region, modelId };
}

export function createBedrockClient(config: BedrockConfig): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

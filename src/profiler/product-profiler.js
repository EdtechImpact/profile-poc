import {
  loadSchema,
  extractDirectFieldsFromRaw,
  extractComputedFieldsFromRaw,
  getLLMFields,
  buildProfileTextFromTemplate,
} from "../lib/schema-manager.js";
import { extractFieldsWithLLM, generateProfileText } from "../lib/llm.js";
import { createEmbedding } from "../lib/embeddings.js";

export async function generateProductProfile(rawProductData, { skipLLM = false } = {}) {
  const schema = loadSchema("product");
  const entityName = rawProductData.name || "Unknown Product";
  const entityId = rawProductData.slug || rawProductData.product_id || String(rawProductData.id);

  // 1. Direct-mapped fields
  const directFields = extractDirectFieldsFromRaw(rawProductData, schema);

  // 2. Computed fields
  const computedFields = extractComputedFieldsFromRaw(rawProductData, schema);

  // 3. LLM-extracted fields
  let llmFields = {};
  if (!skipLLM) {
    const llmFieldDefs = getLLMFields(schema);
    if (Object.keys(llmFieldDefs).length > 0) {
      // Include description in raw data sent to LLM for richer extraction
      const llmContext = {
        ...rawProductData,
        // Truncate HTML story to keep token usage reasonable
        story: rawProductData.story
          ? rawProductData.story.replace(/<[^>]*>/g, "").substring(0, 1000)
          : undefined,
      };
      llmFields = await extractFieldsWithLLM(llmContext, llmFieldDefs);
    }
  }

  const structuredFields = { ...directFields, ...computedFields, ...llmFields };

  // 4. Generate profile text
  let profileText = buildProfileTextFromTemplate(schema, entityName, structuredFields);
  if (!skipLLM && !profileText) {
    profileText = await generateProfileText("product", entityName, structuredFields, rawProductData);
  }

  // 5. Generate embedding
  let profileEmbedding = null;
  if (profileText) {
    try {
      profileEmbedding = await createEmbedding(profileText);
    } catch (e) {
      console.error(`Embedding failed for product ${entityId}:`, e.message);
    }
  }

  return {
    entity_type: "product",
    entity_id: entityId,
    entity_name: entityName,
    schema_version: schema.version,
    structured_fields: structuredFields,
    raw_data: rawProductData,
    profile_text: profileText,
    profile_embedding: profileEmbedding,
    profiled_by: "titan-v2",
  };
}

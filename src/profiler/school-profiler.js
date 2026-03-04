import {
  loadSchema,
  extractDirectFieldsFromRaw,
  extractComputedFieldsFromRaw,
  getLLMFields,
  buildProfileTextFromTemplate,
} from "../lib/schema-manager.js";
import { extractFieldsWithLLM, generateProfileText } from "../lib/llm.js";
import { createEmbedding } from "../lib/embeddings.js";

export async function generateSchoolProfile(rawSchoolData, { skipLLM = false } = {}) {
  const schema = loadSchema("school");
  const entityName =
    rawSchoolData.EstablishmentName || rawSchoolData.name || "Unknown School";
  const entityId = String(rawSchoolData.URN || rawSchoolData.urn);

  // 1. Direct-mapped fields
  const directFields = extractDirectFieldsFromRaw(rawSchoolData, schema);

  // 2. Computed fields
  const computedFields = extractComputedFieldsFromRaw(rawSchoolData, schema);

  // 3. LLM-extracted fields
  let llmFields = {};
  if (!skipLLM) {
    const llmFieldDefs = getLLMFields(schema);
    if (Object.keys(llmFieldDefs).length > 0) {
      llmFields = await extractFieldsWithLLM(rawSchoolData, llmFieldDefs);
    }
  }

  const structuredFields = { ...directFields, ...computedFields, ...llmFields };

  // 4. Generate profile text
  let profileText = buildProfileTextFromTemplate(schema, entityName, structuredFields);
  if (!skipLLM && !profileText) {
    profileText = await generateProfileText("school", entityName, structuredFields, rawSchoolData);
  }

  // 5. Generate embedding
  let profileEmbedding = null;
  if (profileText) {
    try {
      profileEmbedding = await createEmbedding(profileText);
    } catch (e) {
      console.error(`Embedding failed for school ${entityId}:`, e.message);
    }
  }

  return {
    entity_type: "school",
    entity_id: entityId,
    entity_name: entityName,
    schema_version: schema.version,
    structured_fields: structuredFields,
    raw_data: rawSchoolData,
    profile_text: profileText,
    profile_embedding: profileEmbedding,
    profiled_by: "titan-v2",
  };
}

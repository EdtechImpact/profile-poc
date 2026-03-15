import {
  loadSchema,
  extractDirectFieldsFromRaw,
  extractComputedFieldsFromRaw,
  getLLMFields,
  buildProfileTextFromTemplate,
} from "../lib/schema-manager.js";
import { extractFieldsWithLLM, generateProfileText } from "../lib/llm.js";
import { createEmbedding } from "../lib/embeddings.js";
import { query } from "../lib/db.js";

async function fetchImportedFields(entityId) {
  const imported = {};

  try {
    // Fetch educational impact scores
    const impactResult = await query(
      `SELECT build_student_knowledge, improve_attainment, improve_teaching_efficiency,
              reduce_teacher_workload, improve_teacher_knowledge
       FROM raw_educational_impact WHERE product_id = $1`,
      [entityId]
    );
    if (impactResult.rows.length > 0) {
      const row = impactResult.rows[0];
      imported.educational_impact = {
        build_student_knowledge: row.build_student_knowledge ? Number(row.build_student_knowledge) : null,
        improve_attainment: row.improve_attainment ? Number(row.improve_attainment) : null,
        improve_teaching_efficiency: row.improve_teaching_efficiency ? Number(row.improve_teaching_efficiency) : null,
        reduce_teacher_workload: row.reduce_teacher_workload ? Number(row.reduce_teacher_workload) : null,
        improve_teacher_knowledge: row.improve_teacher_knowledge ? Number(row.improve_teacher_knowledge) : null,
      };
    }

    // Fetch alternatives
    const altResult = await query(
      `SELECT alternative_product_id FROM raw_product_alternatives WHERE product_id = $1`,
      [entityId]
    );
    if (altResult.rows.length > 0) {
      imported.alternatives = altResult.rows.map(r => r.alternative_product_id);
    }
  } catch (e) {
    // Tables may not exist yet — that's fine
    console.log(`  Note: Could not fetch imported fields for ${entityId}: ${e.message}`);
  }

  return imported;
}

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

  // 4. Imported fields (alternatives, educational impact)
  const importedFields = await fetchImportedFields(entityId);

  const structuredFields = { ...directFields, ...computedFields, ...llmFields, ...importedFields };

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

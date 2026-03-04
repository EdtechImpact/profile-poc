import { query, upsertProfile } from "../lib/db.js";
import { loadSchema, getLLMFields, needsBackfill } from "../lib/schema-manager.js";
import { extractFieldsWithLLM } from "../lib/llm.js";
import { createEmbedding } from "../lib/embeddings.js";

export async function backfillProfiles(entityType, { batchSize = 5, dryRun = false } = {}) {
  const schema = loadSchema(entityType);
  const llmFields = getLLMFields(schema);

  // Find profiles with older schema version
  const result = await query(
    `SELECT * FROM entity_profiles WHERE entity_type = $1 AND schema_version != $2`,
    [entityType, schema.version]
  );

  const profiles = result.rows;
  console.log(
    `Found ${profiles.length} ${entityType} profiles needing backfill (current: ${schema.version})`
  );

  if (dryRun) {
    console.log("Dry run — no changes made.");
    return { total: profiles.length, updated: 0 };
  }

  let updated = 0;

  for (let i = 0; i < profiles.length; i += batchSize) {
    const batch = profiles.slice(i, i + batchSize);

    for (const profile of batch) {
      try {
        const rawData = profile.raw_data || {};

        // Re-extract LLM fields using stored raw_data
        const newLLMFields = await extractFieldsWithLLM(rawData, llmFields);

        // Merge with existing structured fields
        const updatedFields = {
          ...profile.structured_fields,
          ...newLLMFields,
        };

        // Regenerate profile text (fields changed)
        const profileText = `${profile.entity_name}. ${Object.entries(updatedFields)
          .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : v}`)
          .join(". ")}`;

        // Re-embed
        const embedding = await createEmbedding(profileText);

        await upsertProfile({
          ...profile,
          schema_version: schema.version,
          structured_fields: updatedFields,
          profile_text: profileText,
          profile_embedding: embedding,
        });

        updated++;
        console.log(`  Updated ${profile.entity_name} (${profile.entity_id})`);
      } catch (e) {
        console.error(`  Failed to backfill ${profile.entity_id}:`, e.message);
      }
    }

    // Rate limit between batches
    if (i + batchSize < profiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log(`Progress: ${Math.min(i + batchSize, profiles.length)}/${profiles.length}`);
  }

  console.log(`Backfill complete: ${updated}/${profiles.length} updated`);
  return { total: profiles.length, updated };
}

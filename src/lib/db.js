import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

let pool;

export function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://poc:poc_local@localhost:5432/profile_poc",
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

export async function query(text, params) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

export async function upsertProfile(profile) {
  const sql = `
    INSERT INTO entity_profiles (entity_type, entity_id, entity_name, schema_version, structured_fields, raw_data, profile_text, profile_embedding, profiled_at, profiled_by)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
    ON CONFLICT (entity_type, entity_id)
    DO UPDATE SET
      entity_name = EXCLUDED.entity_name,
      schema_version = EXCLUDED.schema_version,
      structured_fields = EXCLUDED.structured_fields,
      raw_data = EXCLUDED.raw_data,
      profile_text = EXCLUDED.profile_text,
      profile_embedding = EXCLUDED.profile_embedding,
      profiled_at = NOW(),
      profiled_by = EXCLUDED.profiled_by,
      updated_at = NOW()
    RETURNING id;
  `;

  const embeddingStr = profile.profile_embedding
    ? `[${profile.profile_embedding.join(",")}]`
    : null;

  const result = await query(sql, [
    profile.entity_type,
    profile.entity_id,
    profile.entity_name,
    profile.schema_version,
    JSON.stringify(profile.structured_fields),
    JSON.stringify(profile.raw_data),
    profile.profile_text,
    embeddingStr,
    profile.profiled_by || "titan-v2",
  ]);

  return result.rows[0];
}

export async function getProfile(entityType, entityId) {
  const result = await query(
    "SELECT * FROM entity_profiles WHERE entity_type = $1 AND entity_id = $2",
    [entityType, entityId]
  );
  return result.rows[0] || null;
}

export async function searchProfiles(entityType, searchTerm, limit = 20) {
  // Escape LIKE special characters to prevent wildcard injection
  const escaped = searchTerm.replace(/[%_\\]/g, (ch) => `\\${ch}`);
  const result = await query(
    `SELECT id, entity_type, entity_id, entity_name, schema_version, structured_fields, profile_text, profiled_at
     FROM entity_profiles
     WHERE entity_type = $1 AND (entity_name ILIKE $2 OR entity_id ILIKE $2)
     ORDER BY entity_name
     LIMIT $3`,
    [entityType, `%${escaped}%`, limit]
  );
  return result.rows;
}

export async function findSimilarByEmbedding(entityType, embedding, limit = 50) {
  const embeddingStr = `[${embedding.join(",")}]`;
  const result = await query(
    `SELECT id, entity_type, entity_id, entity_name, structured_fields, profile_text,
            1 - (profile_embedding <=> $1::vector) AS embedding_similarity
     FROM entity_profiles
     WHERE entity_type = $2 AND profile_embedding IS NOT NULL
     ORDER BY profile_embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, entityType, limit]
  );
  return result.rows;
}

export async function findCrossTypeByEmbedding(targetType, embedding, limit = 50) {
  const embeddingStr = `[${embedding.join(",")}]`;
  const result = await query(
    `SELECT id, entity_type, entity_id, entity_name, structured_fields, profile_text,
            1 - (profile_embedding <=> $1::vector) AS embedding_similarity
     FROM entity_profiles
     WHERE entity_type = $2 AND profile_embedding IS NOT NULL
     ORDER BY profile_embedding <=> $1::vector
     LIMIT $3`,
    [embeddingStr, targetType, limit]
  );
  return result.rows;
}

export async function getAllProfiles(entityType) {
  const result = await query(
    "SELECT id, entity_type, entity_id, entity_name, schema_version, structured_fields, profile_text, profiled_at FROM entity_profiles WHERE entity_type = $1 ORDER BY entity_name",
    [entityType]
  );
  return result.rows;
}

export async function getProfilesCount() {
  const result = await query(
    `SELECT entity_type, COUNT(*) as count FROM entity_profiles GROUP BY entity_type`
  );
  return result.rows;
}

export async function upsertSimilarity(sim) {
  const sql = `
    INSERT INTO entity_similarities (entity_type, source_entity_id, similar_entity_id, similarity_score, structured_score, embedding_score, graph_score, explanation)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (entity_type, source_entity_id, similar_entity_id)
    DO UPDATE SET
      similarity_score = EXCLUDED.similarity_score,
      structured_score = EXCLUDED.structured_score,
      embedding_score = EXCLUDED.embedding_score,
      graph_score = EXCLUDED.graph_score,
      explanation = EXCLUDED.explanation,
      computed_at = NOW()
    RETURNING id;
  `;
  return query(sql, [
    sim.entity_type,
    sim.source_entity_id,
    sim.similar_entity_id,
    sim.similarity_score,
    sim.structured_score,
    sim.embedding_score,
    sim.graph_score,
    sim.explanation,
  ]);
}

// ============================================================
// PRODUCT ALTERNATIVES & IMPACT QUERIES
// ============================================================

export async function getProductAlternatives(productId) {
  const result = await query(
    `SELECT rpa.alternative_product_id, ep.entity_name, ep.structured_fields
     FROM raw_product_alternatives rpa
     LEFT JOIN entity_profiles ep ON ep.entity_type = 'product' AND ep.entity_id = rpa.alternative_product_id
     WHERE rpa.product_id = $1`,
    [productId]
  );
  return result.rows;
}

export async function getEducationalImpact(productId) {
  const result = await query(
    `SELECT * FROM raw_educational_impact WHERE product_id = $1`,
    [productId]
  );
  return result.rows[0] || null;
}

// ============================================================
// CHAT THREAD & MESSAGE QUERIES
// ============================================================

export async function createThread(title, entityContext) {
  const result = await query(
    `INSERT INTO chat_threads (title, entity_context) VALUES ($1, $2) RETURNING *`,
    [title, entityContext ? JSON.stringify(entityContext) : null]
  );
  return result.rows[0];
}

export async function getThread(threadId) {
  const result = await query(
    `SELECT t.*, (SELECT COUNT(*) FROM chat_messages WHERE thread_id = t.id) as message_count
     FROM chat_threads t WHERE t.id = $1`,
    [threadId]
  );
  return result.rows[0] || null;
}

export async function listThreads(limit = 20) {
  const result = await query(
    `SELECT t.*, (SELECT COUNT(*) FROM chat_messages WHERE thread_id = t.id) as message_count
     FROM chat_threads t ORDER BY t.updated_at DESC LIMIT $1`,
    [limit]
  );
  return result.rows;
}

export async function addMessage(threadId, role, content, toolCalls, toolResults, metadata) {
  const result = await query(
    `INSERT INTO chat_messages (thread_id, role, content, tool_calls, tool_results, metadata)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [
      threadId,
      role,
      content,
      toolCalls ? JSON.stringify(toolCalls) : null,
      toolResults ? JSON.stringify(toolResults) : null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  // Update thread timestamp
  await query(`UPDATE chat_threads SET updated_at = NOW() WHERE id = $1`, [threadId]);
  return result.rows[0];
}

export async function getMessages(threadId) {
  const result = await query(
    `SELECT * FROM chat_messages WHERE thread_id = $1 ORDER BY created_at ASC`,
    [threadId]
  );
  return result.rows;
}

export async function deleteThread(threadId) {
  await query(`DELETE FROM chat_threads WHERE id = $1`, [threadId]);
}

export async function updateThreadTitle(threadId, title) {
  await query(`UPDATE chat_threads SET title = $1, updated_at = NOW() WHERE id = $2`, [title, threadId]);
}

// ============================================================
// MATCH REPORT QUERIES
// ============================================================

export async function saveMatchReport(threadId, schoolId, reportData) {
  const result = await query(
    `INSERT INTO match_reports (thread_id, school_id, report_data) VALUES ($1, $2, $3) RETURNING *`,
    [threadId, schoolId, JSON.stringify(reportData)]
  );
  return result.rows[0];
}

export async function getMatchReport(reportId) {
  const result = await query(`SELECT * FROM match_reports WHERE id = $1`, [reportId]);
  return result.rows[0] || null;
}

export async function getSimilarEntities(entityType, entityId, limit = 10) {
  const result = await query(
    `SELECT es.*, ep.entity_name, ep.structured_fields, ep.profile_text
     FROM entity_similarities es
     JOIN entity_profiles ep ON ep.entity_type = es.entity_type AND ep.entity_id = es.similar_entity_id
     WHERE es.entity_type = $1 AND es.source_entity_id = $2
     ORDER BY es.similarity_score DESC
     LIMIT $3`,
    [entityType, entityId, limit]
  );
  return result.rows;
}

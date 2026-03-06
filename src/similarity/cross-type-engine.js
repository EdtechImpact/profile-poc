import { getProfile, findCrossTypeByEmbedding } from "../lib/db.js";
import { findCrossTypeMatches } from "../lib/neo4j.js";
import { computeCrossTypeScore } from "./cross-type-scorer.js";

const CROSS_WEIGHTS = {
  structured: 0.40,
  embedding: 0.30,
  graph: 0.30,
};

function parseEmbedding(embeddingStr) {
  if (Array.isArray(embeddingStr)) return embeddingStr;
  if (typeof embeddingStr === "string") {
    return embeddingStr
      .replace("[", "")
      .replace("]", "")
      .split(",")
      .map(Number);
  }
  return embeddingStr;
}

export async function findRecommendations(sourceType, sourceId, { top = 10 } = {}) {
  const source = await getProfile(sourceType, sourceId);
  if (!source) throw new Error(`Profile not found: ${sourceType}/${sourceId}`);

  const targetType = sourceType === "school" ? "product" : "school";
  const candidateMap = new Map();

  // 1. Embedding candidates from opposite type
  if (source.profile_embedding) {
    const embeddingArray = parseEmbedding(source.profile_embedding);
    const embCandidates = await findCrossTypeByEmbedding(targetType, embeddingArray, 50);
    for (const c of embCandidates) {
      if (c.entity_id === sourceId) continue;
      candidateMap.set(c.entity_id, {
        entity_id: c.entity_id,
        entity_name: c.entity_name,
        structured_fields: c.structured_fields,
        profile_text: c.profile_text,
        embedding_score: parseFloat(c.embedding_similarity) || 0,
        graph_score: 0,
      });
    }
  }

  // 2. Graph candidates from cross-type paths
  try {
    const graphCandidates = await findCrossTypeMatches(sourceType, sourceId, 50);
    for (const c of graphCandidates) {
      const existing = candidateMap.get(c.entity_id);
      if (existing) {
        existing.graph_score = c.graph_score || 0;
        existing.shared_nodes = c.shared_nodes || [];
      } else {
        candidateMap.set(c.entity_id, {
          entity_id: c.entity_id,
          entity_name: c.entity_name,
          structured_fields: null,
          profile_text: null,
          embedding_score: 0,
          graph_score: c.graph_score || 0,
          shared_nodes: c.shared_nodes || [],
        });
      }
    }
  } catch (e) {
    console.warn("Cross-type graph unavailable:", e.message);
  }

  // 3. Score all candidates
  const results = [];
  const sourceFields = source.structured_fields || {};

  for (const [candidateId, candidate] of candidateMap) {
    let candidateFields = candidate.structured_fields;
    if (!candidateFields) {
      const profile = await getProfile(targetType, candidateId);
      candidateFields = profile?.structured_fields || {};
      candidate.entity_name = candidate.entity_name || profile?.entity_name;
      candidate.profile_text = profile?.profile_text;
    }

    // Cross-type structured scoring
    const [schoolFields, productFields] =
      sourceType === "school"
        ? [sourceFields, candidateFields]
        : [candidateFields, sourceFields];

    const structured = computeCrossTypeScore(schoolFields, productFields);

    const embeddingScore = candidate.embedding_score || 0;
    const graphScore = candidate.graph_score || 0;

    const finalScore =
      CROSS_WEIGHTS.structured * structured.total +
      CROSS_WEIGHTS.embedding * embeddingScore +
      CROSS_WEIGHTS.graph * graphScore;

    results.push({
      entity_id: candidateId,
      entity_type: targetType,
      entity_name: candidate.entity_name,
      structured_fields: candidateFields,
      profile_text: candidate.profile_text,
      match_score: Math.round(finalScore * 10000) / 10000,
      structured_score: Math.round(structured.total * 10000) / 10000,
      embedding_score: Math.round(embeddingScore * 10000) / 10000,
      graph_score: Math.round(graphScore * 10000) / 10000,
      structured_breakdown: structured.breakdown,
      shared_nodes: candidate.shared_nodes || [],
    });
  }

  results.sort((a, b) => b.match_score - a.match_score);
  return results.slice(0, top);
}

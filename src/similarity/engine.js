import { getProfile, findSimilarByEmbedding } from "../lib/db.js";
import { getNodeSimilarity } from "../lib/neo4j.js";
import { computeStructuredScore } from "./structured-scorer.js";

const WEIGHTS = {
  structured: 0.40,
  embedding: 0.40,
  graph: 0.20, // Now measures non-redundant signals only (tech needs / school type targeting)
};

export async function findSimilarEntities(entityType, entityId, { top = 10, includeGraph = true } = {}) {
  // 1. Get source profile
  const source = await getProfile(entityType, entityId);
  if (!source) throw new Error(`Profile not found: ${entityType}/${entityId}`);

  // 2. Gather candidates from multiple sources
  const candidateMap = new Map();

  // 2a. Embedding-based candidates (pgvector)
  if (source.profile_embedding) {
    const embeddingStr =
      typeof source.profile_embedding === "string"
        ? source.profile_embedding
        : source.profile_embedding;

    // Parse embedding from Postgres format if needed
    let embeddingArray;
    if (typeof embeddingStr === "string") {
      embeddingArray = embeddingStr
        .replace("[", "")
        .replace("]", "")
        .split(",")
        .map(Number);
    } else {
      embeddingArray = embeddingStr;
    }

    const embeddingCandidates = await findSimilarByEmbedding(
      entityType,
      embeddingArray,
      50
    );

    for (const c of embeddingCandidates) {
      if (c.entity_id === entityId) continue;
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

  // 2b. Graph-based candidates (Neo4j)
  if (includeGraph) {
    try {
      const graphCandidates = await getNodeSimilarity(entityType, entityId, 50);
      for (const c of graphCandidates) {
        if (c.entity_id === entityId) continue;
        const existing = candidateMap.get(c.entity_id);
        if (existing) {
          existing.graph_score = c.graph_score || 0;
          existing.shared_graph_nodes = c.shared_names || [];
        } else {
          candidateMap.set(c.entity_id, {
            entity_id: c.entity_id,
            entity_name: c.entity_name,
            structured_fields: null, // Will be fetched if needed
            profile_text: null,
            embedding_score: 0,
            graph_score: c.graph_score || 0,
            shared_graph_nodes: c.shared_names || [],
          });
        }
      }
    } catch (e) {
      // Graph scoring unavailable — continue without it
    }
  }

  // 3. Batch-fetch missing profiles to avoid N+1
  const missingIds = [...candidateMap.entries()]
    .filter(([, c]) => !c.structured_fields)
    .map(([id]) => id);

  if (missingIds.length > 0) {
    const missingProfiles = await Promise.all(
      missingIds.map((id) => getProfile(entityType, id))
    );
    for (let i = 0; i < missingIds.length; i++) {
      const profile = missingProfiles[i];
      const candidate = candidateMap.get(missingIds[i]);
      if (candidate && profile) {
        candidate.structured_fields = profile.structured_fields || {};
        candidate.entity_name = candidate.entity_name || profile.entity_name;
        candidate.profile_text = profile.profile_text;
      }
    }
  }

  // 4. Compute full hybrid scores
  const results = [];
  const sourceFields = source.structured_fields || {};

  for (const [candidateId, candidate] of candidateMap) {
    const candidateFields = candidate.structured_fields || {};

    // Structured score
    const structured = computeStructuredScore(entityType, sourceFields, candidateFields);
    const structuredScore = structured.total;

    // Weighted combination
    const embeddingScore = candidate.embedding_score || 0;
    const graphScore = candidate.graph_score || 0;

    const finalScore =
      WEIGHTS.structured * structuredScore +
      WEIGHTS.embedding * embeddingScore +
      WEIGHTS.graph * graphScore;

    // Generate explanation
    const explanation = generateExplanation(
      entityType,
      source,
      candidate,
      structured.breakdown,
      embeddingScore,
      graphScore
    );

    results.push({
      entity_id: candidateId,
      entity_name: candidate.entity_name,
      structured_fields: candidateFields,
      profile_text: candidate.profile_text,
      similarity_score: Math.round(finalScore * 10000) / 10000,
      structured_score: Math.round(structuredScore * 10000) / 10000,
      embedding_score: Math.round(embeddingScore * 10000) / 10000,
      graph_score: Math.round(graphScore * 10000) / 10000,
      shared_graph_nodes: candidate.shared_graph_nodes || [],
      explanation,
    });
  }

  // 4. Sort and return top N
  results.sort((a, b) => b.similarity_score - a.similarity_score);
  return results.slice(0, top);
}

function generateExplanation(entityType, source, candidate, structuredBreakdown, embeddingScore, graphScore) {
  const parts = [];

  if (entityType === "school") {
    if (structuredBreakdown.phase === 1) parts.push("same phase");
    if (structuredBreakdown.type === 1) parts.push("same school type");
    if (structuredBreakdown.region === 1) parts.push("same region");
    if (structuredBreakdown.fsm_band === 1) parts.push("similar deprivation");
    if (structuredBreakdown.trust_name === 1) parts.push("same trust");
    if (structuredBreakdown.ofsted_rating >= 0.75) parts.push("similar Ofsted");
  } else {
    if (structuredBreakdown.primary_category === 1) parts.push("same category");
    if (structuredBreakdown.subjects > 0.5) parts.push("overlapping subjects");
    if (structuredBreakdown.age_range > 0.5) parts.push("similar age range");
    if (structuredBreakdown.pedagogy_style === 1) parts.push("same pedagogy");
  }

  if (embeddingScore > 0.8) parts.push("very similar profile descriptions");
  else if (embeddingScore > 0.6) parts.push("similar profile descriptions");

  if (graphScore > 0.5) parts.push("strong relationship overlap");
  else if (graphScore > 0.2) parts.push("some shared connections");

  return parts.length > 0
    ? `Matched on: ${parts.join(", ")}`
    : "Low similarity across all dimensions";
}

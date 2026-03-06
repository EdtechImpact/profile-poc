import neo4j from "neo4j-driver";
import "dotenv/config";

let driver;

export function getDriver() {
  if (!driver) {
    driver = neo4j.driver(
      process.env.NEO4J_URI || "bolt://localhost:7687",
      neo4j.auth.basic(
        process.env.NEO4J_USER || "neo4j",
        process.env.NEO4J_PASSWORD || "poc_local"
      )
    );
  }
  return driver;
}

export async function runCypher(cypher, params = {}) {
  const session = getDriver().session();
  try {
    const result = await session.run(cypher, params);
    return result.records;
  } finally {
    await session.close();
  }
}

export async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
  }
}

// ============================================================
// GRAPH SYNC: Push profiles from Postgres into Neo4j
// ============================================================

export async function syncSchoolToGraph(profile) {
  const fields = profile.structured_fields || {};

  // Create/merge school node
  await runCypher(
    `MERGE (s:School {urn: $urn})
     SET s.name = $name,
         s.phase = $phase,
         s.type = $type,
         s.size_band = $size_band,
         s.fsm_band = $fsm_band,
         s.ofsted = $ofsted,
         s.urban_rural = $urban_rural,
         s.region = $region,
         s.has_sixth_form = $has_sixth_form,
         s.deprivation_level = $deprivation_level,
         s.school_character = $school_character`,
    {
      urn: profile.entity_id,
      name: profile.entity_name || "",
      phase: fields.phase || "",
      type: fields.type || "",
      size_band: fields.size_band || "",
      fsm_band: fields.fsm_band || "",
      ofsted: fields.ofsted_rating || "",
      urban_rural: fields.urban_rural || "",
      region: fields.region || "",
      has_sixth_form: fields.has_sixth_form || false,
      deprivation_level: fields.deprivation_level || "",
      school_character: fields.school_character || "",
    }
  );

  // Connect to taxonomy nodes
  if (fields.phase) {
    await runCypher(
      `MERGE (p:Phase {name: $phase})
       WITH p
       MATCH (s:School {urn: $urn})
       MERGE (s)-[:IS_PHASE]->(p)`,
      { phase: fields.phase, urn: profile.entity_id }
    );
  }

  if (fields.region) {
    await runCypher(
      `MERGE (r:Region {name: $region})
       WITH r
       MATCH (s:School {urn: $urn})
       MERGE (s)-[:IN_REGION]->(r)`,
      { region: fields.region, urn: profile.entity_id }
    );
  }

  if (fields.trust_name) {
    await runCypher(
      `MERGE (t:Trust {name: $trust})
       WITH t
       MATCH (s:School {urn: $urn})
       MERGE (s)-[:IN_TRUST]->(t)`,
      { trust: fields.trust_name, urn: profile.entity_id }
    );
  }
}

export async function syncProductToGraph(profile) {
  const fields = profile.structured_fields || {};

  // Create/merge product node
  await runCypher(
    `MERGE (p:Product {slug: $slug})
     SET p.name = $name,
         p.primary_category = $primary_category,
         p.age_range = $age_range,
         p.purchase_model = $purchase_model,
         p.pedagogy_style = $pedagogy_style,
         p.send_suitability = $send_suitability,
         p.value_proposition = $value_proposition`,
    {
      slug: profile.entity_id,
      name: profile.entity_name || "",
      primary_category: fields.primary_category || "",
      age_range: Array.isArray(fields.age_range)
        ? fields.age_range.join(", ")
        : fields.age_range || "",
      purchase_model: fields.purchase_model || "",
      pedagogy_style: fields.pedagogy_style || "",
      send_suitability: fields.send_suitability || "",
      value_proposition: fields.value_proposition || "",
    }
  );

  // Connect to category
  if (fields.primary_category) {
    await runCypher(
      `MERGE (c:Category {name: $category})
       WITH c
       MATCH (p:Product {slug: $slug})
       MERGE (p)-[:IN_CATEGORY]->(c)`,
      { category: fields.primary_category, slug: profile.entity_id }
    );
  }

  // Connect to subjects
  const subjects = fields.subjects || [];
  for (const subject of subjects) {
    await runCypher(
      `MERGE (sub:Subject {name: $subject})
       WITH sub
       MATCH (p:Product {slug: $slug})
       MERGE (p)-[:COVERS_SUBJECT]->(sub)`,
      { subject, slug: profile.entity_id }
    );
  }
}

// ============================================================
// GRAPH QUERIES
// ============================================================

const VALID_ENTITY_TYPES = new Set(["school", "product"]);

function resolveEntityLabel(entityType) {
  if (!VALID_ENTITY_TYPES.has(entityType)) {
    throw new Error(`Invalid entity type: ${entityType}`);
  }
  return entityType === "school"
    ? { nodeLabel: "School", idField: "urn" }
    : { nodeLabel: "Product", idField: "slug" };
}

export async function getGraphNeighbors(entityType, entityId, depth = 1) {
  const { nodeLabel, idField } = resolveEntityLabel(entityType);
  const safeDepth = Math.max(1, Math.min(Math.floor(Number(depth)) || 1, 4));

  const records = await runCypher(
    `MATCH (n:${nodeLabel} {${idField}: $id})-[r*1..${safeDepth}]-(m)
     RETURN n, r, m
     LIMIT 100`,
    { id: entityId }
  );

  const nodes = new Map();
  const links = [];

  for (const record of records) {
    const source = record.get("n");
    const target = record.get("m");
    const rels = record.get("r");

    const sourceId = `${source.labels[0]}_${Object.values(source.properties)[0]}`;
    const targetId = `${target.labels[0]}_${Object.values(target.properties)[0]}`;

    if (!nodes.has(sourceId)) {
      nodes.set(sourceId, {
        id: sourceId,
        label: source.properties.name || Object.values(source.properties)[0],
        type: source.labels[0],
        properties: source.properties,
      });
    }

    if (!nodes.has(targetId)) {
      nodes.set(targetId, {
        id: targetId,
        label: target.properties.name || Object.values(target.properties)[0],
        type: target.labels[0],
        properties: target.properties,
      });
    }

    for (const rel of rels) {
      links.push({
        source: sourceId,
        target: targetId,
        type: rel.type,
      });
    }
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
  };
}

export async function getAllGraph(limit = 300) {
  const records = await runCypher(
    `MATCH (n)-[r]->(m)
     RETURN n, r, m
     LIMIT $limit`,
    { limit: neo4j.int(limit) }
  );

  const nodes = new Map();
  const links = [];

  for (const record of records) {
    const source = record.get("n");
    const target = record.get("m");
    const rel = record.get("r");

    const sourceId = `${source.labels[0]}_${Object.values(source.properties)[0]}`;
    const targetId = `${target.labels[0]}_${Object.values(target.properties)[0]}`;

    if (!nodes.has(sourceId)) {
      nodes.set(sourceId, {
        id: sourceId,
        label: source.properties.name || Object.values(source.properties)[0],
        type: source.labels[0],
        properties: source.properties,
      });
    }

    if (!nodes.has(targetId)) {
      nodes.set(targetId, {
        id: targetId,
        label: target.properties.name || Object.values(target.properties)[0],
        type: target.labels[0],
        properties: target.properties,
      });
    }

    links.push({
      source: sourceId,
      target: targetId,
      type: rel.type,
    });
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
  };
}

export async function findPathBetween(entityType, fromId, toId) {
  const { nodeLabel, idField } = resolveEntityLabel(entityType);

  const records = await runCypher(
    `MATCH path = shortestPath(
       (a:${nodeLabel} {${idField}: $from})-[*..6]-(b:${nodeLabel} {${idField}: $to})
     )
     RETURN path`,
    { from: fromId, to: toId }
  );

  if (records.length === 0) return null;

  const path = records[0].get("path");
  const nodes = path.segments.map((seg) => ({
    label: seg.start.properties.name || Object.values(seg.start.properties)[0],
    type: seg.start.labels[0],
  }));
  // Add the last node
  const lastSeg = path.segments[path.segments.length - 1];
  nodes.push({
    label: lastSeg.end.properties.name || Object.values(lastSeg.end.properties)[0],
    type: lastSeg.end.labels[0],
  });

  const relationships = path.segments.map((seg) => seg.relationship.type);

  return { nodes, relationships };
}

export async function getNodeSimilarity(entityType, entityId, limit = 20) {
  const { nodeLabel, idField } = resolveEntityLabel(entityType);

  // Use Jaccard similarity based on shared relationships
  const records = await runCypher(
    `MATCH (n:${nodeLabel} {${idField}: $id})-[:IS_PHASE|IN_REGION|IN_TRUST|IN_CATEGORY|COVERS_SUBJECT]->(shared)
     WITH n, collect(shared) AS n_neighbors
     MATCH (other:${nodeLabel})-[:IS_PHASE|IN_REGION|IN_TRUST|IN_CATEGORY|COVERS_SUBJECT]->(shared)
     WHERE other <> n
     WITH n, other, n_neighbors, collect(shared) AS other_neighbors
     WITH other,
          [x IN n_neighbors WHERE x IN other_neighbors] AS intersection,
          n_neighbors + [x IN other_neighbors WHERE NOT x IN n_neighbors] AS union_set
     WITH other,
          toFloat(size(intersection)) / toFloat(size(union_set)) AS jaccard
     WHERE jaccard > 0
     RETURN other.${idField} AS entity_id, other.name AS entity_name, jaccard
     ORDER BY jaccard DESC
     LIMIT $limit`,
    { id: entityId, limit: neo4j.int(limit) }
  );

  return records.map((r) => ({
    entity_id: r.get("entity_id"),
    entity_name: r.get("entity_name"),
    graph_score: r.get("jaccard"),
  }));
}

export async function findCrossTypeMatches(sourceType, sourceId, limit = 50) {
  const { nodeLabel: sourceLabel, idField: sourceIdField } = resolveEntityLabel(sourceType);
  const targetType = sourceType === "school" ? "product" : "school";
  const { nodeLabel: targetLabel, idField: targetIdField } = resolveEntityLabel(targetType);

  const records = await runCypher(
    `MATCH (s:${sourceLabel} {${sourceIdField}: $id})-[]->(shared)<-[]-(t:${targetLabel})
     WITH t, count(shared) AS shared_count, collect(shared.name) AS shared_nodes
     RETURN t.${targetIdField} AS entity_id, t.name AS entity_name,
            toFloat(shared_count) / 5.0 AS graph_score, shared_nodes
     ORDER BY shared_count DESC
     LIMIT $limit`,
    { id: sourceId, limit: neo4j.int(limit) }
  );

  return records.map((r) => ({
    entity_id: r.get("entity_id"),
    entity_name: r.get("entity_name"),
    graph_score: Math.min(r.get("graph_score"), 1.0),
    shared_nodes: r.get("shared_nodes"),
  }));
}

export async function getCommunities(entityType) {
  // Simple community detection using connected components
  // In production, use GDS Louvain
  const { nodeLabel, idField } = resolveEntityLabel(entityType);

  const records = await runCypher(
    `MATCH (n:${nodeLabel})-[:IS_PHASE|IN_REGION|IN_TRUST|IN_CATEGORY|COVERS_SUBJECT]->(shared)<-[:IS_PHASE|IN_REGION|IN_TRUST|IN_CATEGORY|COVERS_SUBJECT]-(m:${nodeLabel})
     WHERE n <> m
     WITH shared, collect(DISTINCT n.${idField}) AS members
     WHERE size(members) > 1
     RETURN shared.name AS cluster_name, labels(shared)[0] AS cluster_type, members, size(members) AS size
     ORDER BY size DESC
     LIMIT 50`,
    {}
  );

  return records.map((r) => ({
    cluster_name: r.get("cluster_name"),
    cluster_type: r.get("cluster_type"),
    members: r.get("members"),
    size: r.get("size").toNumber ? r.get("size").toNumber() : r.get("size"),
  }));
}

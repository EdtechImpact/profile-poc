import "dotenv/config";
import { getAllProfiles, getPool } from "../lib/db.js";
import { syncSchoolToGraph, syncProductToGraph, runCypher, closeDriver } from "../lib/neo4j.js";

async function syncProfilesToGraph() {
  console.log("=== Syncing Profiles to Neo4j ===\n");

  // Clear existing graph
  console.log("Clearing existing graph...");
  await runCypher("MATCH (n) DETACH DELETE n");

  // Sync schools
  const schools = await getAllProfiles("school");
  console.log(`Syncing ${schools.length} school profiles...`);

  let schoolSuccess = 0;
  for (const school of schools) {
    try {
      await syncSchoolToGraph(school);
      schoolSuccess++;
    } catch (e) {
      console.error(`  Failed school ${school.entity_id}:`, e.message);
    }
  }
  console.log(`  Schools synced: ${schoolSuccess}/${schools.length}`);

  // Sync products
  const products = await getAllProfiles("product");
  console.log(`Syncing ${products.length} product profiles...`);

  let productSuccess = 0;
  for (const product of products) {
    try {
      await syncProductToGraph(product);
      productSuccess++;
    } catch (e) {
      console.error(`  Failed product ${product.entity_id}:`, e.message);
    }
  }
  console.log(`  Products synced: ${productSuccess}/${products.length}`);

  // Create indexes for performance
  console.log("\nCreating Neo4j indexes...");
  const indexes = [
    "CREATE INDEX school_urn IF NOT EXISTS FOR (s:School) ON (s.urn)",
    "CREATE INDEX product_slug IF NOT EXISTS FOR (p:Product) ON (p.slug)",
    "CREATE INDEX category_name IF NOT EXISTS FOR (c:Category) ON (c.name)",
    "CREATE INDEX subject_name IF NOT EXISTS FOR (s:Subject) ON (s.name)",
    "CREATE INDEX trust_name IF NOT EXISTS FOR (t:Trust) ON (t.name)",
    "CREATE INDEX region_name IF NOT EXISTS FOR (r:Region) ON (r.name)",
    "CREATE INDEX phase_name IF NOT EXISTS FOR (p:Phase) ON (p.name)",
  ];

  for (const idx of indexes) {
    try {
      await runCypher(idx);
    } catch (e) {
      // Index may already exist
    }
  }

  // Print graph stats
  const nodeCount = await runCypher("MATCH (n) RETURN count(n) AS count");
  const relCount = await runCypher("MATCH ()-[r]->() RETURN count(r) AS count");

  console.log(`\nGraph stats:`);
  console.log(`  Nodes: ${nodeCount[0].get("count")}`);
  console.log(`  Relationships: ${relCount[0].get("count")}`);
  console.log("\nGraph sync complete.");
}

async function main() {
  try {
    await syncProfilesToGraph();
  } catch (err) {
    console.error("Graph sync failed:", err);
    process.exit(1);
  } finally {
    await closeDriver();
    const pool = getPool();
    await pool.end();
  }
}

main();

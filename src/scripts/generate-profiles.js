import "dotenv/config";
import { query, upsertProfile, getPool } from "../lib/db.js";
import { generateSchoolProfile } from "../profiler/school-profiler.js";
import { generateProductProfile } from "../profiler/product-profiler.js";

const BATCH_SIZE = 5;
const DELAY_MS = 1000;

async function generateSchoolProfiles({ limit, skipLLM = false } = {}) {
  console.log("--- Generating school profiles ---");

  const limitClause = limit ? `LIMIT ${limit}` : "";
  const result = await query(
    `SELECT urn, data FROM raw_schools ORDER BY urn ${limitClause}`
  );

  const schools = result.rows;
  console.log(`Found ${schools.length} schools to profile`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < schools.length; i += BATCH_SIZE) {
    const batch = schools.slice(i, i + BATCH_SIZE);

    for (const school of batch) {
      try {
        const rawData = typeof school.data === "string" ? JSON.parse(school.data) : school.data;
        const profile = await generateSchoolProfile(rawData, { skipLLM });
        await upsertProfile(profile);
        success++;
      } catch (e) {
        console.error(`  Failed school ${school.urn}:`, e.message);
        failed++;
      }
    }

    console.log(
      `  Progress: ${Math.min(i + BATCH_SIZE, schools.length)}/${schools.length} (${success} ok, ${failed} failed)`
    );

    if (i + BATCH_SIZE < schools.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`School profiles: ${success} created, ${failed} failed`);
  return { success, failed };
}

async function generateProductProfiles({ limit, skipLLM = false } = {}) {
  console.log("--- Generating product profiles ---");

  const limitClause = limit ? `LIMIT ${limit}` : "";
  const result = await query(
    `SELECT product_id, data FROM raw_products ORDER BY product_id ${limitClause}`
  );

  const products = result.rows;
  console.log(`Found ${products.length} products to profile`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    for (const product of batch) {
      try {
        const rawData =
          typeof product.data === "string" ? JSON.parse(product.data) : product.data;
        const profile = await generateProductProfile(rawData, { skipLLM });
        await upsertProfile(profile);
        success++;
      } catch (e) {
        console.error(`  Failed product ${product.product_id}:`, e.message);
        failed++;
      }
    }

    console.log(
      `  Progress: ${Math.min(i + BATCH_SIZE, products.length)}/${products.length} (${success} ok, ${failed} failed)`
    );

    if (i + BATCH_SIZE < products.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.log(`Product profiles: ${success} created, ${failed} failed`);
  return { success, failed };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const type = args.find((a) => a.startsWith("--type="))?.split("=")[1] || "all";
  const limit = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const skipLLM = args.includes("--skip-llm");

  console.log("=== Profile Generation ===");
  console.log(`Type: ${type}, Limit: ${limit || "none"}, Skip LLM: ${skipLLM}\n`);

  try {
    if (type === "all" || type === "school") {
      await generateSchoolProfiles({ limit: limit ? parseInt(limit) : undefined, skipLLM });
    }
    if (type === "all" || type === "product") {
      await generateProductProfiles({ limit: limit ? parseInt(limit) : undefined, skipLLM });
    }

    console.log("\nProfile generation complete.");
  } catch (err) {
    console.error("Profile generation failed:", err);
    process.exit(1);
  } finally {
    const pool = getPool();
    await pool.end();
  }
}

main();

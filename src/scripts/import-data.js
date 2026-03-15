import "dotenv/config";
import pg from "pg";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const { Pool } = pg;

const localDb = new Pool({
  connectionString:
    process.env.DATABASE_URL || "postgresql://poc:poc_local@localhost:5432/profile_poc",
});

// ============================================================
// IMPORT SCHOOLS FROM DYNAMODB
// ============================================================

async function importSchools() {
  console.log("--- Importing schools from DynamoDB ---");

  const dynamo = new DynamoDBClient({
    region: process.env.PROD_DYNAMODB_REGION || "eu-west-2",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  const tableName = process.env.PROD_DYNAMODB_TABLE || "schools-production";
  let lastEvaluatedKey;
  let totalImported = 0;

  do {
    const params = {
      TableName: tableName,
      ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey }),
    };

    const result = await dynamo.send(new ScanCommand(params));
    const items = (result.Items || []).map((item) => unmarshall(item));

    for (const school of items) {
      const urn = school.URN || school.urn;
      if (!urn) continue;

      await localDb.query(
        `INSERT INTO raw_schools (urn, data) VALUES ($1, $2)
         ON CONFLICT (urn) DO UPDATE SET data = $2, imported_at = NOW()`,
        [urn, JSON.stringify(school)]
      );
      totalImported++;
    }

    lastEvaluatedKey = result.LastEvaluatedKey;
    console.log(`  Imported ${totalImported} schools...`);
  } while (lastEvaluatedKey);

  console.log(`Schools import complete: ${totalImported} total`);
  return totalImported;
}

// ============================================================
// IMPORT PRODUCTS FROM SUPABASE
// ============================================================

async function importProducts() {
  console.log("--- Importing products from production Supabase ---");

  const prodDb = new Pool({
    connectionString: process.env.PROD_SUPABASE_URL,
  });

  let totalImported = 0;

  try {
    // Get products with categories and subjects
    const result = await prodDb.query(`
      SELECT
        p.*,
        COALESCE(
          json_agg(DISTINCT pc.category_id) FILTER (WHERE pc.category_id IS NOT NULL),
          '[]'
        ) AS category_ids,
        COALESCE(
          json_agg(DISTINCT ps.subject_id) FILTER (WHERE ps.subject_id IS NOT NULL),
          '[]'
        ) AS subject_ids
      FROM products p
      LEFT JOIN product_categories pc ON p.id = pc.product_id
      LEFT JOIN product_subjects ps ON p.id = ps.product_id
      GROUP BY p.id
    `);

    for (const product of result.rows) {
      const productId = product.slug || String(product.id);

      await localDb.query(
        `INSERT INTO raw_products (product_id, data) VALUES ($1, $2)
         ON CONFLICT (product_id) DO UPDATE SET data = $2, imported_at = NOW()`,
        [productId, JSON.stringify(product)]
      );
      totalImported++;
    }
  } finally {
    await prodDb.end();
  }

  console.log(`Products import complete: ${totalImported} total`);
  return totalImported;
}

// ============================================================
// IMPORT PRODUCT ALTERNATIVES FROM SUPABASE
// ============================================================

async function importProductAlternatives() {
  console.log("--- Importing product alternatives from production Supabase ---");

  const prodDb = new Pool({
    connectionString: process.env.PROD_SUPABASE_URL,
  });

  let totalImported = 0;

  try {
    // Create table if not exists (for incremental runs)
    await localDb.query(`
      CREATE TABLE IF NOT EXISTS raw_product_alternatives (
        id SERIAL PRIMARY KEY,
        product_id TEXT NOT NULL,
        alternative_product_id TEXT NOT NULL,
        imported_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(product_id, alternative_product_id)
      )
    `);

    // Try different possible table/column names defensively
    let result;
    try {
      result = await prodDb.query(`SELECT * FROM product_alternatives LIMIT 5`);
      console.log("  Found table: product_alternatives");
      console.log("  Columns:", Object.keys(result.rows[0] || {}));
    } catch {
      try {
        result = await prodDb.query(`SELECT * FROM product_alternative LIMIT 5`);
        console.log("  Found table: product_alternative");
        console.log("  Columns:", Object.keys(result.rows[0] || {}));
      } catch {
        console.log("  Trying to discover alternatives tables...");
        const tables = await prodDb.query(`
          SELECT table_name FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name ILIKE '%alternative%'
        `);
        console.log("  Tables matching 'alternative':", tables.rows.map(r => r.table_name));

        if (tables.rows.length > 0) {
          const tableName = tables.rows[0].table_name;
          result = await prodDb.query(`SELECT * FROM "${tableName}" LIMIT 5`);
          console.log(`  Using table: ${tableName}`);
          console.log("  Columns:", Object.keys(result.rows[0] || {}));
        } else {
          console.log("  No alternatives table found. Skipping.");
          return 0;
        }
      }
    }

    // Now do the full import - detect column names from the sample
    if (result && result.rows.length > 0) {
      const cols = Object.keys(result.rows[0]);
      console.log("  Available columns:", cols);

      // Try to identify the product_id and alternative_product_id columns
      const productIdCol = cols.find(c => c === "product_id") || cols.find(c => c.includes("product") && !c.includes("alternative")) || cols[0];
      const altIdCol = cols.find(c => c === "alternative_product_id" || c === "alternative_id") || cols.find(c => c.includes("alternative")) || cols[1];

      console.log(`  Mapping: ${productIdCol} -> product_id, ${altIdCol} -> alternative_product_id`);

      // Determine the table name that worked
      const tableName = result.command ? "product_alternatives" : "product_alternative";
      let fullResult;
      try {
        fullResult = await prodDb.query(`SELECT "${productIdCol}", "${altIdCol}" FROM product_alternatives`);
      } catch {
        try {
          fullResult = await prodDb.query(`SELECT "${productIdCol}", "${altIdCol}" FROM product_alternative`);
        } catch {
          // Use the discovered table
          const tables = await prodDb.query(`
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name ILIKE '%alternative%'
          `);
          if (tables.rows.length > 0) {
            fullResult = await prodDb.query(`SELECT "${productIdCol}", "${altIdCol}" FROM "${tables.rows[0].table_name}"`);
          }
        }
      }

      if (fullResult) {
        for (const row of fullResult.rows) {
          const productId = String(row[productIdCol]);
          const altId = String(row[altIdCol]);
          if (!productId || !altId) continue;

          try {
            await localDb.query(
              `INSERT INTO raw_product_alternatives (product_id, alternative_product_id)
               VALUES ($1, $2)
               ON CONFLICT (product_id, alternative_product_id) DO NOTHING`,
              [productId, altId]
            );
            totalImported++;
          } catch (e) {
            // Skip duplicates silently
          }
        }
      }
    }
  } catch (err) {
    console.error("  Alternatives import error:", err.message);
    console.log("  Continuing without alternatives data...");
  } finally {
    await prodDb.end();
  }

  console.log(`Product alternatives import complete: ${totalImported} total`);
  return totalImported;
}

// ============================================================
// IMPORT EDUCATIONAL IMPACT SCORES FROM SUPABASE
// ============================================================

async function importEducationalImpact() {
  console.log("--- Importing educational impact scores from production Supabase ---");

  const prodDb = new Pool({
    connectionString: process.env.PROD_SUPABASE_URL,
  });

  let totalImported = 0;

  try {
    // Create table if not exists
    await localDb.query(`
      CREATE TABLE IF NOT EXISTS raw_educational_impact (
        id SERIAL PRIMARY KEY,
        product_id TEXT UNIQUE NOT NULL,
        build_student_knowledge NUMERIC(5,2),
        improve_attainment NUMERIC(5,2),
        improve_teaching_efficiency NUMERIC(5,2),
        reduce_teacher_workload NUMERIC(5,2),
        improve_teacher_knowledge NUMERIC(5,2),
        imported_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Discover where impact scores live
    // Could be in products table directly, or a separate table
    let impactData = [];

    // Try dedicated impact tables first
    const impactTables = await prodDb.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND (table_name ILIKE '%impact%' OR table_name ILIKE '%evidence%' OR table_name ILIKE '%score%')
    `);
    console.log("  Tables matching impact/evidence/score:", impactTables.rows.map(r => r.table_name));

    if (impactTables.rows.length > 0) {
      for (const { table_name } of impactTables.rows) {
        try {
          const sample = await prodDb.query(`SELECT * FROM "${table_name}" LIMIT 3`);
          if (sample.rows.length > 0) {
            console.log(`  Table ${table_name} columns:`, Object.keys(sample.rows[0]));
          }
        } catch (e) {
          console.log(`  Could not read ${table_name}: ${e.message}`);
        }
      }
    }

    // Check if impact scores are columns on the products table
    try {
      const productCols = await prodDb.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'products' AND table_schema = 'public'
        AND (column_name ILIKE '%impact%' OR column_name ILIKE '%knowledge%'
             OR column_name ILIKE '%attainment%' OR column_name ILIKE '%efficiency%'
             OR column_name ILIKE '%workload%')
      `);
      console.log("  Impact-related columns on products table:", productCols.rows.map(r => r.column_name));

      if (productCols.rows.length > 0) {
        const colNames = productCols.rows.map(r => r.column_name);
        const selectCols = colNames.map(c => `"${c}"`).join(", ");
        const result = await prodDb.query(`SELECT slug, ${selectCols} FROM products WHERE ${colNames.map(c => `"${c}" IS NOT NULL`).join(" OR ")}`);
        console.log(`  Found ${result.rows.length} products with impact data`);

        for (const row of result.rows) {
          impactData.push({
            product_id: row.slug,
            ...row,
          });
        }
      }
    } catch (e) {
      console.log("  Could not check products columns:", e.message);
    }

    // If no data from products table, try dedicated tables
    if (impactData.length === 0 && impactTables.rows.length > 0) {
      for (const { table_name } of impactTables.rows) {
        try {
          const result = await prodDb.query(`SELECT * FROM "${table_name}"`);
          if (result.rows.length > 0) {
            const cols = Object.keys(result.rows[0]);
            console.log(`  Trying ${table_name} with ${result.rows.length} rows, cols: ${cols.join(", ")}`);
            impactData = result.rows;
            break;
          }
        } catch {
          continue;
        }
      }
    }

    // Map and insert whatever we found
    for (const row of impactData) {
      const productId = row.product_id || row.slug || String(row.id);
      if (!productId) continue;

      // Try to map column names to our 5 dimensions
      const scores = {
        build_student_knowledge: findImpactValue(row, ["build_student_knowledge", "student_knowledge", "knowledge"]),
        improve_attainment: findImpactValue(row, ["improve_attainment", "attainment"]),
        improve_teaching_efficiency: findImpactValue(row, ["improve_teaching_efficiency", "teaching_efficiency", "efficiency"]),
        reduce_teacher_workload: findImpactValue(row, ["reduce_teacher_workload", "teacher_workload", "workload"]),
        improve_teacher_knowledge: findImpactValue(row, ["improve_teacher_knowledge", "teacher_knowledge"]),
      };

      // Skip if all null
      if (Object.values(scores).every(v => v === null)) continue;

      try {
        await localDb.query(
          `INSERT INTO raw_educational_impact
           (product_id, build_student_knowledge, improve_attainment, improve_teaching_efficiency, reduce_teacher_workload, improve_teacher_knowledge)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (product_id) DO UPDATE SET
             build_student_knowledge = COALESCE(EXCLUDED.build_student_knowledge, raw_educational_impact.build_student_knowledge),
             improve_attainment = COALESCE(EXCLUDED.improve_attainment, raw_educational_impact.improve_attainment),
             improve_teaching_efficiency = COALESCE(EXCLUDED.improve_teaching_efficiency, raw_educational_impact.improve_teaching_efficiency),
             reduce_teacher_workload = COALESCE(EXCLUDED.reduce_teacher_workload, raw_educational_impact.reduce_teacher_workload),
             improve_teacher_knowledge = COALESCE(EXCLUDED.improve_teacher_knowledge, raw_educational_impact.improve_teacher_knowledge),
             imported_at = NOW()`,
          [productId, scores.build_student_knowledge, scores.improve_attainment, scores.improve_teaching_efficiency, scores.reduce_teacher_workload, scores.improve_teacher_knowledge]
        );
        totalImported++;
      } catch (e) {
        console.error(`  Error inserting impact for ${productId}:`, e.message);
      }
    }
  } catch (err) {
    console.error("  Impact import error:", err.message);
    console.log("  Continuing without impact data...");
  } finally {
    await prodDb.end();
  }

  console.log(`Educational impact import complete: ${totalImported} total`);
  return totalImported;
}

function findImpactValue(row, possibleKeys) {
  for (const key of possibleKeys) {
    // Check exact match
    if (row[key] !== undefined && row[key] !== null) return Number(row[key]);
    // Check case-insensitive
    const found = Object.keys(row).find(k => k.toLowerCase() === key.toLowerCase());
    if (found && row[found] !== undefined && row[found] !== null) return Number(row[found]);
  }
  return null;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log("=== Data Import ===\n");

  try {
    const schoolCount = await importSchools();
    const productCount = await importProducts();
    const altCount = await importProductAlternatives();
    const impactCount = await importEducationalImpact();

    console.log(`\nImport summary:`);
    console.log(`  Schools: ${schoolCount}`);
    console.log(`  Products: ${productCount}`);
    console.log(`  Product alternatives: ${altCount}`);
    console.log(`  Educational impact scores: ${impactCount}`);
    console.log(`\nProduction credentials can now be removed from .env`);
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  } finally {
    await localDb.end();
  }
}

main();

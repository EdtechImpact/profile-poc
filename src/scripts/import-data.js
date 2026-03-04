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
// MAIN
// ============================================================

async function main() {
  console.log("=== Data Import ===\n");

  try {
    const schoolCount = await importSchools();
    const productCount = await importProducts();

    console.log(`\nImport summary:`);
    console.log(`  Schools: ${schoolCount}`);
    console.log(`  Products: ${productCount}`);
    console.log(`\nProduction credentials can now be removed from .env`);
  } catch (err) {
    console.error("Import failed:", err);
    process.exit(1);
  } finally {
    await localDb.end();
  }
}

main();

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType, entityId, skipLLM = false } = body;

    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    if (entityType === "school") {
      const { generateSchoolProfile } = await import(
        "../../../src/profiler/school-profiler.js"
      );
      const { query } = await import("../../../src/lib/db.js");

      // Get raw data
      const rawResult = await query(
        "SELECT data FROM raw_schools WHERE urn = $1",
        [parseInt(entityId)]
      );
      if (rawResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Raw school data not found" },
          { status: 404 }
        );
      }

      const profile = await generateSchoolProfile(
        rawResult.rows[0].data,
        skipLLM
      );
      return NextResponse.json({ success: true, profile });
    }

    if (entityType === "product") {
      const { generateProductProfile } = await import(
        "../../../src/profiler/product-profiler.js"
      );
      const { query } = await import("../../../src/lib/db.js");

      const rawResult = await query(
        "SELECT data FROM raw_products WHERE product_id = $1",
        [entityId]
      );
      if (rawResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Raw product data not found" },
          { status: 404 }
        );
      }

      const profile = await generateProductProfile(
        rawResult.rows[0].data,
        skipLLM
      );
      return NextResponse.json({ success: true, profile });
    }

    return NextResponse.json({ error: "Invalid entityType" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: "Generation failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityType } = body;

    if (!entityType || !["school", "product"].includes(entityType)) {
      return NextResponse.json(
        { error: "Invalid entityType. Must be 'school' or 'product'" },
        { status: 400 }
      );
    }

    // Dynamic import to avoid bundling issues
    const { backfillProfiles } = await import(
      "../../../src/profiler/backfill.js"
    );

    const result = await backfillProfiles(entityType);
    return NextResponse.json({
      success: true,
      updated: result?.updated || 0,
      message: `Backfill complete for ${entityType} profiles`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Backfill failed" },
      { status: 500 }
    );
  }
}

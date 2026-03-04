import { NextRequest, NextResponse } from "next/server";
import { findPathBetween } from "../../../../src/lib/neo4j.js";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const fromId = searchParams.get("fromId");
  const toId = searchParams.get("toId");

  if (!type || !fromId || !toId) {
    return NextResponse.json(
      { error: "type, fromId, and toId are required" },
      { status: 400 }
    );
  }

  try {
    const path = await findPathBetween(type, fromId, toId);
    return NextResponse.json({ path });
  } catch (err) {
    return NextResponse.json(
      { error: "Path query failed", details: (err as Error).message },
      { status: 500 }
    );
  }
}

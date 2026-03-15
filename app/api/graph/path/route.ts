import { NextRequest, NextResponse } from "next/server";
import { findPathBetween } from "../../../../src/lib/neo4j.js";

const VALID_TYPES = new Set(["school", "product"]);

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

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }
  if (fromId.length > 200 || toId.length > 200) {
    return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
  }

  try {
    const path = await findPathBetween(type, fromId, toId);
    return NextResponse.json({ path });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

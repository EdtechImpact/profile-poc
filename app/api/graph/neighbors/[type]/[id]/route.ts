import { NextRequest, NextResponse } from "next/server";
import { getGraphNeighbors } from "@/src/lib/neo4j";

const VALID_TYPES = new Set(["school", "product"]);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }
  if (!id || id.length > 200) {
    return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const rawDepth = parseInt(searchParams.get("depth") || "1");
  const depth = Number.isNaN(rawDepth) ? 1 : Math.max(1, Math.min(rawDepth, 3));

  try {
    const graph = await getGraphNeighbors(type, id, depth);
    return NextResponse.json(graph);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

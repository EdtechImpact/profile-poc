import { NextRequest, NextResponse } from "next/server";
import { getGraphNeighbors } from "@/src/lib/neo4j";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const { searchParams } = new URL(req.url);
  const depth = parseInt(searchParams.get("depth") || "1");

  try {
    const graph = await getGraphNeighbors(type, id, Math.min(depth, 3));
    return NextResponse.json(graph);
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

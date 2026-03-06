import { NextRequest, NextResponse } from "next/server";
import { getAllGraph } from "@/src/lib/neo4j";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "500");

  try {
    const graph = await getAllGraph(Math.min(limit, 1000));
    return NextResponse.json(graph);
  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

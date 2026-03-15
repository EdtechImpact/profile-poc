import { NextRequest, NextResponse } from "next/server";
import { getAllGraph } from "@/src/lib/neo4j";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawLimit = parseInt(searchParams.get("limit") || "500");
  const limit = Number.isNaN(rawLimit) ? 500 : Math.max(1, Math.min(rawLimit, 1000));

  try {
    const graph = await getAllGraph(limit);
    const res = NextResponse.json(graph);
    res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300");
    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

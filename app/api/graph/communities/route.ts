import { NextRequest, NextResponse } from "next/server";
import { getCommunities } from "@/src/lib/neo4j";

const VALID_TYPES = new Set(["school", "product"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "school";

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  try {
    const communities = await getCommunities(type);
    const res = NextResponse.json({ communities });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

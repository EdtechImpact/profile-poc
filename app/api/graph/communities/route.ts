import { NextRequest, NextResponse } from "next/server";
import { getCommunities } from "@/src/lib/neo4j";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "school";

  try {
    const communities = await getCommunities(type);
    return NextResponse.json({ communities });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { findSimilarEntities } from "@/src/similarity/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;
  const { searchParams } = new URL(req.url);
  const top = parseInt(searchParams.get("top") || "10");
  const includeGraph = searchParams.get("graph") !== "false";

  try {
    const results = await findSimilarEntities(type, id, { top, includeGraph });
    return NextResponse.json({ source: { type, id }, similar: results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

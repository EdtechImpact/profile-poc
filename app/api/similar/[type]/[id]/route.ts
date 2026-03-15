import { NextRequest, NextResponse } from "next/server";
import { findSimilarEntities } from "@/src/similarity/engine";

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
  const rawTop = parseInt(searchParams.get("top") || "10");
  const top = Number.isNaN(rawTop) ? 10 : Math.max(1, Math.min(rawTop, 50));
  const includeGraph = searchParams.get("graph") !== "false";

  try {
    const results = await findSimilarEntities(type, id, { top, includeGraph });
    return NextResponse.json({ source: { type, id }, similar: results });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

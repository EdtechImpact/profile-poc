import { NextRequest, NextResponse } from "next/server";
import { findRecommendations } from "@/src/similarity/cross-type-engine";

const VALID_TYPES = new Set(["school", "product"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const rawTop = parseInt(searchParams.get("top") || "10");
  const top = Number.isNaN(rawTop) ? 10 : Math.max(1, Math.min(rawTop, 20));

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }
  if (id.length > 200) {
    return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
  }

  try {
    const recommendations = await findRecommendations(type, id, { top });
    const targetType = type === "school" ? "product" : "school";
    return NextResponse.json({
      source: { type, id },
      target_type: targetType,
      recommendations,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

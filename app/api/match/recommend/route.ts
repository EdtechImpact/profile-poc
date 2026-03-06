import { NextRequest, NextResponse } from "next/server";
import { findRecommendations } from "@/src/similarity/cross-type-engine";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const top = parseInt(searchParams.get("top") || "10");

  if (!type || !id) {
    return NextResponse.json(
      { error: "type and id are required" },
      { status: 400 }
    );
  }

  try {
    const recommendations = await findRecommendations(type, id, {
      top: Math.min(top, 20),
    });
    const targetType = type === "school" ? "product" : "school";
    return NextResponse.json({
      source: { type, id },
      target_type: targetType,
      recommendations,
    });
  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

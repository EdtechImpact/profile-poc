import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/src/lib/db";

const VALID_TYPES = new Set(["school", "product"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const { type, id } = await params;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  if (!id || id.length > 200) {
    return NextResponse.json({ error: "Invalid entity ID" }, { status: 400 });
  }

  try {
    const profile = await getProfile(type, id);
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    return NextResponse.json({ profile });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { searchProfiles, getAllProfiles, getProfilesCount } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const type = searchParams.get("type") || "school";
  const limit = parseInt(searchParams.get("limit") || "100");

  try {
    const counts = await getProfilesCount();

    if (!q) {
      const profiles = await getAllProfiles(type);
      return NextResponse.json({ counts, profiles });
    }

    const profiles = await searchProfiles(type, q, limit);
    return NextResponse.json({ counts, profiles });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

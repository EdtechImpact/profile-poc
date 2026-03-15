import { NextRequest, NextResponse } from "next/server";
import { searchProfiles, getAllProfiles, getProfilesCount } from "@/src/lib/db";

const VALID_TYPES = new Set(["school", "product"]);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").slice(0, 200);
  const type = searchParams.get("type") || "school";
  const rawLimit = parseInt(searchParams.get("limit") || "100");
  const limit = Number.isNaN(rawLimit) ? 100 : Math.max(1, Math.min(rawLimit, 500));

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid entity type" }, { status: 400 });
  }

  try {
    const counts = await getProfilesCount();

    if (!q) {
      const profiles = await getAllProfiles(type);
      const res = NextResponse.json({ counts, profiles });
      res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
      return res;
    }

    const profiles = await searchProfiles(type, q, limit);
    const res = NextResponse.json({ counts, profiles });
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
    return res;
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

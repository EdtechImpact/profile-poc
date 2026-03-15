import { NextRequest, NextResponse } from "next/server";
import { listThreads, createThread } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  try {
    const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const limit = Number.isNaN(rawLimit) ? 20 : Math.max(1, Math.min(rawLimit, 100));
    const threads = await listThreads(limit);
    return NextResponse.json({ threads });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const title = typeof body.title === "string" ? body.title.slice(0, 200) : null;
    const thread = await createThread(title, body.entity_context);
    return NextResponse.json({ thread });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

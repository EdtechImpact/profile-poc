import { NextRequest, NextResponse } from "next/server";
import { listThreads, createThread } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
    const threads = await listThreads(limit);
    return NextResponse.json({ threads });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { title, entity_context } = await req.json();
    const thread = await createThread(title, entity_context);
    return NextResponse.json({ thread });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

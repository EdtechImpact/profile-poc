import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  if (type !== "school" && type !== "product") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const schemaPath = path.join(
      process.cwd(),
      "schemas",
      `${type}-profile-schema.json`
    );
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    const schema = JSON.parse(schemaContent);
    return NextResponse.json({ schema });
  } catch (err) {
    return NextResponse.json(
      { error: "Schema not found", details: (err as Error).message },
      { status: 404 }
    );
  }
}

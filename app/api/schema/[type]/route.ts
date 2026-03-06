import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getSchemaPath(type: string) {
  return path.join(process.cwd(), "schemas", `${type}-profile-schema.json`);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  if (type !== "school" && type !== "product") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const schemaPath = getSchemaPath(type);
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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;

  if (type !== "school" && type !== "product") {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const schema = body.schema;

    if (!schema || !schema.fields || !schema.version) {
      return NextResponse.json({ error: "Invalid schema format" }, { status: 400 });
    }

    const schemaPath = getSchemaPath(type);
    fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2) + "\n", "utf-8");

    return NextResponse.json({ success: true, schema });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save schema", details: (err as Error).message },
      { status: 500 }
    );
  }
}

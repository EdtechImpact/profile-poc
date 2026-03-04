import { readFileSync } from "fs";
import { join } from "path";

const SCHEMAS_DIR = join(process.cwd(), "schemas");

export function loadSchema(entityType) {
  const filePath = join(SCHEMAS_DIR, `${entityType}-profile-schema.json`);
  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

export function getDirectFields(schema) {
  return Object.entries(schema.fields)
    .filter(([, f]) => f.extraction === "direct")
    .reduce((acc, [name, field]) => ({ ...acc, [name]: field }), {});
}

export function getComputedFields(schema) {
  return Object.entries(schema.fields)
    .filter(([, f]) => f.extraction === "computed")
    .reduce((acc, [name, field]) => ({ ...acc, [name]: field }), {});
}

export function getLLMFields(schema) {
  return Object.entries(schema.fields)
    .filter(([, f]) => f.extraction === "llm")
    .reduce((acc, [name, field]) => ({ ...acc, [name]: field }), {});
}

export function extractDirectFieldsFromRaw(rawData, schema) {
  const directFields = getDirectFields(schema);
  const result = {};

  for (const [name, field] of Object.entries(directFields)) {
    const value = rawData[field.source];
    if (value !== undefined && value !== null) {
      result[name] = value;
    }
  }

  return result;
}

export function extractComputedFieldsFromRaw(rawData, schema) {
  const computedFields = getComputedFields(schema);
  const result = {};

  for (const [name, field] of Object.entries(computedFields)) {
    const value = rawData[field.source];
    if (value === undefined || value === null) continue;

    try {
      // Simple expression evaluation for computed fields
      const fn = new Function("value", `return ${field.compute}`);
      result[name] = fn(value);
    } catch (e) {
      console.error(`Compute error for ${name}:`, e.message);
    }
  }

  return result;
}

export function buildProfileTextFromTemplate(schema, entityName, fields) {
  if (!schema.profile_text_template) return null;

  let text = schema.profile_text_template;
  text = text.replace("{entity_name}", entityName || "Unknown");

  for (const [key, value] of Object.entries(fields)) {
    const placeholder = `{${key}}`;
    const displayValue = Array.isArray(value) ? value.join(", ") : String(value || "");
    text = text.replaceAll(placeholder, displayValue);
  }

  // Clean up any remaining placeholders
  text = text.replace(/\{[^}]+\}/g, "");
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

export function needsBackfill(profile, schema) {
  return profile.schema_version !== schema.version;
}

export function getNewFieldsSinceVersion(schema, oldVersion) {
  // For simplicity, returns all LLM fields if version differs
  // A production system would track field additions per version
  return getLLMFields(schema);
}

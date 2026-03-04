"use client";

import { useState, useEffect } from "react";

interface SchemaField {
  type: string;
  extraction: string;
  source?: string;
  compute?: string;
  prompt?: string;
  values?: string[];
}

interface Schema {
  version: string;
  entity_type: string;
  fields: Record<string, SchemaField>;
  profile_text_template: string;
}

export default function SchemaPage() {
  const [activeTab, setActiveTab] = useState<"school" | "product">("school");
  const [schema, setSchema] = useState<Schema | null>(null);
  const [loading, setLoading] = useState(true);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);

  useEffect(() => {
    async function loadSchema() {
      setLoading(true);
      try {
        const res = await fetch(`/api/schema/${activeTab}`);
        const data = await res.json();
        setSchema(data.schema || null);
      } catch {
        setSchema(null);
      } finally {
        setLoading(false);
      }
    }
    loadSchema();
  }, [activeTab]);

  const handleBackfill = async () => {
    setBackfillStatus("running");
    try {
      const res = await fetch("/api/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: activeTab }),
      });
      const data = await res.json();
      setBackfillStatus(
        data.success
          ? `Backfill complete: ${data.updated || 0} profiles updated`
          : `Backfill failed: ${data.error}`
      );
    } catch {
      setBackfillStatus("Backfill request failed");
    }
  };

  const extractionColors: Record<string, string> = {
    direct: "bg-blue-100 text-blue-700",
    computed: "bg-amber-100 text-amber-700",
    llm: "bg-purple-100 text-purple-700",
  };

  return (
    <div className="max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        Schema Manager
      </h1>
      <p className="text-slate-500 text-sm mb-6">
        View and manage evolving profile schemas. Add new fields to extract more
        insights.
      </p>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-lg p-1 w-fit mb-6">
        {(["school", "product"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Schema
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">
          Loading schema...
        </div>
      ) : !schema ? (
        <div className="text-center py-12 text-slate-400">
          Schema not found. Make sure schema JSON files exist in the schemas/
          directory.
        </div>
      ) : (
        <>
          {/* Schema info */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 flex items-center justify-between">
            <div>
              <span className="text-sm text-slate-500">Version:</span>{" "}
              <span className="font-mono text-sm font-medium text-slate-700">
                {schema.version}
              </span>
              <span className="mx-3 text-slate-300">|</span>
              <span className="text-sm text-slate-500">Fields:</span>{" "}
              <span className="font-medium text-slate-700">
                {Object.keys(schema.fields).length}
              </span>
              <span className="mx-3 text-slate-300">|</span>
              <span className="text-sm text-slate-500">LLM fields:</span>{" "}
              <span className="font-medium text-purple-600">
                {
                  Object.values(schema.fields).filter(
                    (f) => f.extraction === "llm"
                  ).length
                }
              </span>
            </div>
            <button
              onClick={handleBackfill}
              disabled={backfillStatus === "running"}
              className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm hover:bg-purple-700 disabled:opacity-50"
            >
              {backfillStatus === "running" ? "Running..." : "Run Backfill"}
            </button>
          </div>

          {backfillStatus && backfillStatus !== "running" && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-6 text-sm text-slate-600">
              {backfillStatus}
            </div>
          )}

          {/* Fields table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Field Name
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Extraction
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">
                    Source / Prompt
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(schema.fields).map(([name, field]) => (
                  <tr
                    key={name}
                    className="border-b border-slate-50 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {name}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="font-mono text-xs">{field.type}</span>
                      {field.values && (
                        <div className="text-xs text-slate-400 mt-0.5">
                          [{field.values.join(", ")}]
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${extractionColors[field.extraction] || "bg-slate-100 text-slate-600"}`}
                      >
                        {field.extraction}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs max-w-xs">
                      {field.extraction === "direct" && field.source && (
                        <span className="font-mono">{field.source}</span>
                      )}
                      {field.extraction === "computed" && field.compute && (
                        <code className="bg-slate-100 px-1 rounded">
                          {field.compute}
                        </code>
                      )}
                      {field.extraction === "llm" && field.prompt && (
                        <span className="italic">{field.prompt}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Profile text template */}
          <div className="bg-white rounded-lg border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase mb-3">
              Profile Text Template
            </h2>
            <pre className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 rounded p-4 font-mono">
              {schema.profile_text_template}
            </pre>
          </div>
        </>
      )}
    </div>
  );
}

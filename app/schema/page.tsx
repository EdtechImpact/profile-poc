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
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [backfillStatus, setBackfillStatus] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [addingField, setAddingField] = useState(false);
  const [editTemplate, setEditTemplate] = useState(false);

  useEffect(() => {
    async function loadSchema() {
      setLoading(true);
      setSaveStatus(null);
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

  const saveSchema = async (updated: Schema) => {
    setSaving(true);
    setSaveStatus(null);
    try {
      const res = await fetch(`/api/schema/${activeTab}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schema: updated }),
      });
      const data = await res.json();
      if (data.success) {
        setSchema(data.schema);
        setSaveStatus("Saved successfully");
      } else {
        setSaveStatus(`Error: ${data.error}`);
      }
    } catch {
      setSaveStatus("Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleDeleteField = (fieldName: string) => {
    if (!schema) return;
    const updated = { ...schema, fields: { ...schema.fields } };
    delete updated.fields[fieldName];
    saveSchema(updated);
  };

  const handleSaveField = (fieldName: string, field: SchemaField, originalName?: string) => {
    if (!schema) return;
    const updated = { ...schema, fields: { ...schema.fields } };
    if (originalName && originalName !== fieldName) {
      delete updated.fields[originalName];
    }
    updated.fields[fieldName] = field;
    saveSchema(updated);
    setEditingField(null);
    setAddingField(false);
  };

  const handleSaveTemplate = (template: string) => {
    if (!schema) return;
    saveSchema({ ...schema, profile_text_template: template });
    setEditTemplate(false);
  };

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
    direct: "bg-blue-50 text-blue-700 border-blue-200",
    computed: "bg-amber-50 text-amber-700 border-amber-200",
    llm: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in-down">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-glow-purple">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Schema Manager</h1>
          <p className="text-slate-500 text-sm">
            View and edit profile extraction schemas
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit mb-6 animate-fade-in-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        {(["school", "product"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setEditingField(null); setAddingField(false); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white text-slate-800 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Schema
          </button>
        ))}
      </div>

      {/* Save status toast */}
      {saveStatus && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg animate-fade-in-down ${
          saveStatus.startsWith("Error") || saveStatus.startsWith("Failed")
            ? "bg-red-50 text-red-700 border border-red-200"
            : "bg-emerald-50 text-emerald-700 border border-emerald-200"
        }`}>
          {saveStatus}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 gap-2">
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          Loading schema...
        </div>
      ) : !schema ? (
        <div className="text-center py-12 text-slate-400">
          Schema not found. Make sure schema JSON files exist in the schemas/ directory.
        </div>
      ) : (
        <>
          {/* Schema info bar */}
          <div className="glass-card p-4 mb-6 flex items-center justify-between animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
            <div className="flex items-center gap-4 text-sm">
              <div>
                <span className="text-slate-400">Version:</span>{" "}
                <span className="font-mono font-semibold text-slate-700">{schema.version}</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div>
                <span className="text-slate-400">Fields:</span>{" "}
                <span className="font-semibold text-slate-700">{Object.keys(schema.fields).length}</span>
              </div>
              <div className="w-px h-4 bg-slate-200" />
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-xs text-slate-500">{Object.values(schema.fields).filter(f => f.extraction === "direct").length} direct</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-xs text-slate-500">{Object.values(schema.fields).filter(f => f.extraction === "computed").length} computed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  <span className="text-xs text-slate-500">{Object.values(schema.fields).filter(f => f.extraction === "llm").length} LLM</span>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBackfill}
                disabled={backfillStatus === "running"}
                className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-sm font-medium hover:bg-purple-100 disabled:opacity-50 transition-all"
              >
                {backfillStatus === "running" ? "Running..." : "Run Backfill"}
              </button>
            </div>
          </div>

          {backfillStatus && backfillStatus !== "running" && (
            <div className="glass-card p-3 mb-6 text-sm text-slate-600 animate-fade-in">
              {backfillStatus}
            </div>
          )}

          {/* Fields */}
          <div className="glass-card overflow-hidden mb-6 animate-fade-in-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50/90 to-slate-50/50 border-b border-slate-200/60">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Schema Fields</h2>
              <button
                onClick={() => { setAddingField(true); setEditingField(null); }}
                className="px-3 py-1.5 text-xs font-medium bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 transition-all flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add Field
              </button>
            </div>

            {/* Add new field form */}
            {addingField && (
              <FieldEditor
                onSave={(name, field) => handleSaveField(name, field)}
                onCancel={() => setAddingField(false)}
                saving={saving}
              />
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200/60">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Field</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Extraction</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Source / Prompt</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(schema.fields).map(([name, field], i) => (
                  editingField === name ? (
                    <tr key={name}>
                      <td colSpan={5} className="p-0">
                        <FieldEditor
                          initialName={name}
                          initialField={field}
                          onSave={(newName, newField) => handleSaveField(newName, newField, name)}
                          onCancel={() => setEditingField(null)}
                          saving={saving}
                        />
                      </td>
                    </tr>
                  ) : (
                    <tr
                      key={name}
                      className="border-b border-slate-50/60 hover:bg-slate-50/50 transition-colors group animate-fade-in"
                      style={{ animationDelay: `${0.2 + i * 0.02}s`, animationFillMode: "both" }}
                    >
                      <td className="px-4 py-3 font-semibold text-slate-800">{name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{field.type}</span>
                        {field.values && (
                          <div className="text-[10px] text-slate-400 mt-1 max-w-[200px] truncate">
                            [{field.values.join(", ")}]
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-medium border ${extractionColors[field.extraction] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {field.extraction}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs max-w-xs">
                        {field.extraction === "direct" && field.source && (
                          <span className="font-mono bg-slate-50 px-1.5 py-0.5 rounded">{field.source}</span>
                        )}
                        {field.extraction === "computed" && field.compute && (
                          <code className="bg-slate-50 px-1.5 py-0.5 rounded text-amber-700">{field.compute}</code>
                        )}
                        {field.extraction === "llm" && field.prompt && (
                          <span className="italic text-purple-600 line-clamp-2">{field.prompt}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingField(name); setAddingField(false); }}
                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-all"
                            title="Edit field"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { if (confirm(`Delete field "${name}"?`)) handleDeleteField(name); }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Delete field"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                ))}
              </tbody>
            </table>
          </div>

          {/* Profile text template */}
          <div className="glass-card p-6 animate-fade-in-up" style={{ animationDelay: "0.25s", animationFillMode: "both" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Profile Text Template
              </h2>
              <button
                onClick={() => setEditTemplate(!editTemplate)}
                className="text-xs text-slate-400 hover:text-brand-600 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                </svg>
                {editTemplate ? "Cancel" : "Edit"}
              </button>
            </div>
            {editTemplate ? (
              <TemplateEditor
                initial={schema.profile_text_template}
                onSave={handleSaveTemplate}
                onCancel={() => setEditTemplate(false)}
                saving={saving}
              />
            ) : (
              <pre className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50/80 rounded-xl p-4 font-mono border border-slate-100">
                {schema.profile_text_template}
              </pre>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FieldEditor({
  initialName,
  initialField,
  onSave,
  onCancel,
  saving,
}: {
  initialName?: string;
  initialField?: SchemaField;
  onSave: (name: string, field: SchemaField) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [name, setName] = useState(initialName || "");
  const [type, setType] = useState(initialField?.type || "text");
  const [extraction, setExtraction] = useState(initialField?.extraction || "direct");
  const [source, setSource] = useState(initialField?.source || "");
  const [compute, setCompute] = useState(initialField?.compute || "");
  const [prompt, setPrompt] = useState(initialField?.prompt || "");
  const [values, setValues] = useState(initialField?.values?.join(", ") || "");

  const handleSubmit = () => {
    if (!name.trim()) return;
    const field: SchemaField = { type, extraction };
    if (extraction === "direct" && source) field.source = source;
    if (extraction === "computed") { field.source = source; field.compute = compute; }
    if (extraction === "llm" && prompt) field.prompt = prompt;
    if (type === "enum" && values.trim()) {
      field.values = values.split(",").map((v) => v.trim()).filter(Boolean);
    }
    onSave(name.trim().replace(/\s+/g, "_").toLowerCase(), field);
  };

  return (
    <div className="bg-brand-50/30 border-y border-brand-100 p-4 animate-fade-in">
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-slate-500 block mb-1 font-medium">Field Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. school_character"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1 font-medium">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="text">text</option>
              <option value="enum">enum</option>
              <option value="number">number</option>
              <option value="boolean">boolean</option>
              <option value="array">array</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1 font-medium">Extraction</label>
            <select
              value={extraction}
              onChange={(e) => setExtraction(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="direct">direct</option>
              <option value="computed">computed</option>
              <option value="llm">llm</option>
            </select>
          </div>
        </div>
      </div>

      {type === "enum" && (
        <div className="mb-3">
          <label className="text-xs text-slate-500 block mb-1 font-medium">Enum Values (comma-separated)</label>
          <input
            type="text"
            value={values}
            onChange={(e) => setValues(e.target.value)}
            placeholder="e.g. low, medium, high"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
      )}

      {extraction === "direct" && (
        <div className="mb-3">
          <label className="text-xs text-slate-500 block mb-1 font-medium">Source Field (from raw data)</label>
          <input
            type="text"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="e.g. PhaseOfEducation_name"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-mono"
          />
        </div>
      )}

      {extraction === "computed" && (
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-xs text-slate-500 block mb-1 font-medium">Source Field</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="e.g. NumberOfPupils"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-mono"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1 font-medium">Compute Expression</label>
            <input
              type="text"
              value={compute}
              onChange={(e) => setCompute(e.target.value)}
              placeholder="e.g. value < 200 ? 'small' : 'large'"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 font-mono"
            />
          </div>
        </div>
      )}

      {extraction === "llm" && (
        <div className="mb-3">
          <label className="text-xs text-slate-500 block mb-1 font-medium">LLM Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what the LLM should extract..."
            rows={3}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleSubmit}
          disabled={!name.trim() || saving}
          className="px-4 py-2 gradient-bg text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all hover:shadow-glow-brand"
        >
          {saving ? "Saving..." : initialName ? "Update Field" : "Add Field"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function TemplateEditor({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: string;
  onSave: (template: string) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [value, setValue] = useState(initial);

  return (
    <div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={4}
        className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none font-mono"
      />
      <p className="text-[10px] text-slate-400 mt-1 mb-3">
        Use {"{field_name}"} placeholders to reference schema fields.
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave(value)}
          disabled={saving}
          className="px-4 py-2 gradient-bg text-white rounded-xl text-sm font-medium disabled:opacity-50 transition-all hover:shadow-glow-brand"
        >
          {saving ? "Saving..." : "Save Template"}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors">
          Cancel
        </button>
      </div>
    </div>
  );
}

"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import EntitySearchSelect from "../components/entity-search";
import { useAWSCredentials } from "../components/aws-credentials-provider";

interface ReasoningStep {
  type: "thinking" | "tool_call" | "tool_result";
  tool?: string;
  input?: Record<string, unknown>;
  result_summary?: string;
  text?: string;
}

export default function AnalyzePageWrapper() {
  return (
    <Suspense
      fallback={<div className="text-center py-12 text-slate-400">Loading...</div>}
    >
      <AnalyzePage />
    </Suspense>
  );
}

function AnalyzePage() {
  const searchParams = useSearchParams();
  const { getHeaders, isConfigured, setShowSettings } = useAWSCredentials();
  const initialType = searchParams.get("type") || "";
  const initialId = searchParams.get("id") || "";

  const [entityType, setEntityType] = useState(initialType || "school");
  const [entityId, setEntityId] = useState(initialId);
  const [entityName, setEntityName] = useState("");
  const [query, setQuery] = useState("");
  const [analysis, setAnalysis] = useState("");
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [showReasoning, setShowReasoning] = useState(true);
  const resultRef = useRef<HTMLDivElement>(null);

  // Fetch entity name if we have an initial ID from URL
  useEffect(() => {
    if (initialType && initialId) {
      fetch(`/api/profiles/${initialType}/${initialId}`)
        .then((r) => r.json())
        .then((data) => { if (data.profile) setEntityName(data.profile.entity_name); })
        .catch(() => {});
    }
  }, [initialType, initialId]);

  // Auto-generate query from params
  useEffect(() => {
    if (initialType && initialId && !query) {
      setQuery(
        `Analyze this ${initialType} (ID: ${initialId}) and find the best matches. Explain the reasoning behind each match and identify the key factors.`
      );
    }
  }, [initialType, initialId]); // eslint-disable-line react-hooks/exhaustive-deps

  const runAnalysis = async () => {
    if (!query.trim()) return;
    if (!isConfigured) {
      setShowSettings(true);
      return;
    }
    setLoading(true);
    setAnalysis("");
    setSteps([]);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({
          query,
          entityType: entityId ? entityType : undefined,
          entityId: entityId || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAnalysis(`Error: ${data.error}`);
      } else {
        setAnalysis(data.analysis || "");
        setSteps(data.reasoning_steps || []);
      }
    } catch (e) {
      setAnalysis("Failed to run analysis. Please check your connection and try again.");
    } finally {
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  };

  const PRESET_QUERIES = [
    {
      label: "Deep Match Analysis",
      query: entityId
        ? `Analyze ${entityType} "${entityId}" in depth. Find the top 5 similar entities, explain exactly why each one matches, and identify the key differentiating factors.`
        : "Find the top matching schools and explain the matching reasoning in detail.",
    },
    {
      label: "Graph Relationship Map",
      query: entityId
        ? `Explore the graph neighborhood of ${entityType} "${entityId}". What patterns do you see in its connections? Are there unexpected relationships?`
        : "Explore graph relationships and identify interesting community patterns.",
    },
    {
      label: "Gap Analysis",
      query: entityId
        ? `For ${entityType} "${entityId}", identify what similar entities have that this one doesn't. What gaps exist?`
        : "Identify gaps in the current entity profiles and suggest improvements.",
    },
    {
      label: "Compare Top 2",
      query: entityId
        ? `Find the two most similar entities to ${entityType} "${entityId}" and do a detailed comparison between them.`
        : "Find two highly similar entities and do a detailed side-by-side analysis.",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-in-down">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-xl gradient-bg flex items-center justify-center shadow-glow-brand relative">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            <div className="absolute inset-0 rounded-xl gradient-bg animate-ping opacity-15" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">AI Deep Analysis</h1>
            <p className="text-slate-500 text-sm">
              Claude-powered reasoning to explore matching patterns and insights
            </p>
          </div>
        </div>
      </div>

      {/* Entity context (optional) */}
      <div className="glass-card p-5 mb-5 overflow-visible relative z-20 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <div className="flex gap-3 items-end mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Entity Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all cursor-pointer"
            >
              <option value="school">School</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">
              Entity (optional - focus analysis on specific entity)
            </label>
            <EntitySearchSelect
              entityType={entityType}
              onSelect={(id, name) => { setEntityId(id); setEntityName(name); }}
              placeholder={`Search ${entityType}s by name...`}
              selectedId={entityId}
              selectedName={entityName}
              onClear={() => { setEntityId(""); setEntityName(""); }}
            />
          </div>
        </div>

        {/* Query input */}
        <div className="mb-3">
          <label className="text-xs text-slate-500 block mb-1.5 font-medium">Analysis Query</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask Claude to analyze matching patterns, explain similarities, explore graph relationships..."
            rows={3}
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 resize-none transition-all"
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runAnalysis();
            }}
          />
        </div>

        {/* Preset queries */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_QUERIES.map((preset, i) => (
            <button
              key={i}
              onClick={() => setQuery(preset.query)}
              className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-600 hover:bg-brand-50 hover:text-brand-700 hover:border-brand-200 transition-all duration-200"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <button
          onClick={runAnalysis}
          disabled={loading || !query.trim()}
          className="w-full px-5 py-3 gradient-bg text-white rounded-xl text-sm font-semibold hover:shadow-glow-brand disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing with Claude...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Run Analysis (Cmd+Enter)
            </>
          )}
        </button>
      </div>

      {/* Results */}
      <div ref={resultRef}>
        {(loading || steps.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
            {/* Reasoning Steps - Left Column */}
            <div className="lg:col-span-1">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                  Reasoning Trace
                </h2>
                <button
                  onClick={() => setShowReasoning(!showReasoning)}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors px-2 py-0.5 rounded-lg hover:bg-slate-100"
                >
                  {showReasoning ? "Hide" : "Show"}
                </button>
              </div>

              {showReasoning && (
                <div className="space-y-2">
                  {steps
                    .filter((s) => s.type === "tool_call" || s.type === "tool_result")
                    .map((step, i) => (
                      <div
                        key={i}
                        className="glass-card p-3 animate-slide-up"
                        style={{ animationDelay: `${i * 0.1}s`, animationFillMode: "both" }}
                      >
                        {step.type === "tool_call" && (
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                              <svg className="w-3 h-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384-3.19m0 0a2.003 2.003 0 00-2.573 0L1.5 13.5m5.963-1.52L3.001 6.94m8.419 8.23l5.384-3.19m0 0a2.003 2.003 0 012.573 0L21.5 13.5m-5.963-1.52L19.999 6.94" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-[11px] font-semibold text-brand-700">
                                {formatToolName(step.tool || "")}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                                {formatToolInput(step.input || {})}
                              </div>
                            </div>
                          </div>
                        )}
                        {step.type === "tool_result" && (
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                              <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            </div>
                            <div>
                              <div className="text-[11px] text-emerald-700 font-medium">
                                {step.result_summary}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                  {loading && (
                    <div className="glass-card p-3 flex items-center gap-2 animate-pulse-soft">
                      <div className="w-4 h-4 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                      <span className="text-xs text-slate-500">Reasoning...</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Analysis Result - Right Column */}
            <div className="lg:col-span-2">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Analysis Result
              </h2>
              {analysis ? (
                <div className="glass-card p-6 animate-fade-in-up prose-analysis">
                  <MarkdownRenderer content={analysis} />
                </div>
              ) : loading ? (
                <div className="glass-card p-6">
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-100 rounded-lg w-3/4 animate-pulse" />
                    <div className="h-4 bg-slate-100 rounded-lg w-full animate-pulse" style={{ animationDelay: "0.1s" }} />
                    <div className="h-4 bg-slate-100 rounded-lg w-5/6 animate-pulse" style={{ animationDelay: "0.2s" }} />
                    <div className="h-4 bg-slate-100 rounded-lg w-2/3 animate-pulse" style={{ animationDelay: "0.3s" }} />
                    <div className="h-3 bg-slate-50 rounded-lg w-1/2 animate-pulse" style={{ animationDelay: "0.4s" }} />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatToolInput(input: Record<string, unknown>): string {
  const parts = Object.entries(input)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}: ${v}`);
  return parts.join(", ");
}

// Simple markdown renderer for the analysis output
function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-slate-800 mt-5 mb-2 first:mt-0 flex items-center gap-2">
          <div className="w-1 h-4 rounded-full bg-brand-400" />
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-slate-800 mt-6 mb-2 first:mt-0 flex items-center gap-2">
          <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand-400 to-brand-600" />
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="text-xl font-extrabold text-slate-800 mt-6 mb-3 first:mt-0">
          {renderInline(line.slice(2))}
        </h1>
      );
    }
    // List items
    else if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^\s*/)?.[0].length || 0;
      elements.push(
        <div key={i} className="flex gap-2 my-1" style={{ paddingLeft: `${indent * 8}px` }}>
          <span className="text-brand-400 mt-1 flex-shrink-0">&#8226;</span>
          <span className="text-sm text-slate-700 leading-relaxed">{renderInline(line.replace(/^\s*[-*]\s/, ""))}</span>
        </div>
      );
    }
    // Numbered list
    else if (line.match(/^\s*\d+\.\s/)) {
      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match) {
        elements.push(
          <div key={i} className="flex gap-2 my-1" style={{ paddingLeft: `${(match[1]?.length || 0) * 8}px` }}>
            <span className="text-brand-500 font-bold text-sm flex-shrink-0 w-5 text-right">{match[2]}.</span>
            <span className="text-sm text-slate-700 leading-relaxed">{renderInline(match[3])}</span>
          </div>
        );
      }
    }
    // Empty lines
    else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />);
    }
    // Horizontal rules
    else if (line.match(/^---+$/)) {
      elements.push(<hr key={i} className="border-slate-200/60 my-4" />);
    }
    // Regular paragraphs
    else {
      elements.push(
        <p key={i} className="text-sm text-slate-700 leading-relaxed my-1.5">
          {renderInline(line)}
        </p>
      );
    }

    i++;
  }

  return <div>{elements}</div>;
}

// Render inline markdown (bold, italic, code, keywords)
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  // Match **bold**, *italic*, `code`, and ~~strikethrough~~
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-semibold text-slate-900">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Italic
      parts.push(
        <em key={match.index} className="italic">
          {match[3]}
        </em>
      );
    } else if (match[4]) {
      // Code / keyword highlight
      parts.push(
        <code key={match.index} className="px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded-md text-xs font-mono font-medium border border-brand-100/50">
          {match[4]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

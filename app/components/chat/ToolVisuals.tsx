"use client";

import { useContext, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { ToolCall } from "@/app/hooks/useChat";

// Re-export from shared for backward compatibility
export { EntityClickContext } from "@/app/components/shared/entity-click-context";
export type { EntityClickHandler } from "@/app/components/shared/entity-click-context";
import { EntityClickContext } from "@/app/components/shared/entity-click-context";
import { ImpactBars, IMPACT_LABELS } from "@/app/components/shared/impact-bars";
import { MiniRadar } from "@/app/components/shared/mini-radar";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Set of tool names that have visual renderers (used to avoid rendering empty containers)
export const VISUAL_TOOL_NAMES = new Set([
  "get_educational_impact",
  "compare_impact_scores",
  "find_product_recommendations",
  "get_product_alternatives",
  "get_entity_profile",
  "find_peer_insights",
  "generate_match_report",
  "get_graph_neighbors",
  "visualize_match",
]);

// ─── Impact Comparison ──────────────────────────────────────────────────────

function ImpactComparison({ data }: { data: Record<string, unknown> }) {
  const comparisons = (data.comparisons || []) as Array<{
    product_id: string;
    product_name: string;
    impact: Record<string, number> | null;
  }>;

  if (comparisons.length === 0) return null;

  const dimensions = Object.keys(IMPACT_LABELS);
  const colors = ["bg-brand-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500"];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center">
          <svg className="w-3 h-3 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-600">Impact Comparison</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-3">
        {comparisons.map((c, i) => (
          <div key={c.product_id} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${colors[i % colors.length]}`} />
            <span className="text-[11px] font-medium text-slate-600">{c.product_name || c.product_id}</span>
          </div>
        ))}
      </div>

      {/* Grouped bars */}
      <div className="space-y-3">
        {dimensions.map((dim) => {
          const meta = IMPACT_LABELS[dim];
          const values = comparisons.map((c) => c.impact?.[dim] || 0);
          if (values.every((v) => v === 0)) return null;

          return (
            <div key={dim}>
              <span className="text-[10px] text-slate-400 font-medium">{meta.label}</span>
              <div className="space-y-1 mt-1">
                {comparisons.map((c, i) => {
                  const val = c.impact?.[dim] || 0;
                  return (
                    <div key={c.product_id} className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-500`}
                          style={{ width: `${val}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 w-8 text-right">{val || "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Recommendation Cards ───────────────────────────────────────────────────

function RecommendationCards({ data }: { data: Record<string, unknown> }) {
  const onEntityClick = useContext(EntityClickContext);
  const recs = (data.recommendations || []) as Array<{
    entity_id: string;
    entity_name: string;
    match_score: number;
    score_breakdown?: { structured: number; embedding: number; graph: number };
    structured_fields?: Record<string, unknown>;
  }>;

  if (recs.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-emerald-100 to-emerald-50 flex items-center justify-center">
          <svg className="w-3 h-3 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-600">Top Recommendations</span>
        <span className="text-[10px] text-slate-400 ml-auto">{recs.length} results</span>
      </div>

      <div className="space-y-2">
        {recs.slice(0, 5).map((rec, i) => {
          const score = typeof rec.match_score === "number" ? rec.match_score : 0;
          const pct = Math.round(score * 100);
          const scoreColor = pct >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : pct >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-slate-600 bg-slate-50 border-slate-200";
          const breakdown = rec.score_breakdown;

          // Determine entity type — recommendations are cross-type
          const sourceType = (data.source as Record<string, unknown>)?.type || data.sourceType;
          const resultType: "school" | "product" = sourceType === "school" ? "product" : "school";

          return (
            <button
              key={rec.entity_id}
              onClick={() => onEntityClick?.(resultType, rec.entity_id)}
              className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white border border-slate-100 hover:border-brand-300/60 hover:shadow-md hover:-translate-y-px transition-all cursor-pointer group text-left"
            >
              <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center text-white text-xs font-bold shrink-0 group-hover:shadow-glow-brand/30 transition-shadow">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-700 truncate group-hover:text-brand-600 transition-colors flex items-center gap-1">
                  {rec.entity_name || rec.entity_id}
                  <svg className="w-3 h-3 text-slate-300 group-hover:text-brand-400 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </p>
                {breakdown && (() => {
                  const s = breakdown.structured || 0;
                  const e = breakdown.embedding || 0;
                  const g = breakdown.graph || 0;
                  const total = s + e + g;
                  if (total === 0) return null;
                  const sPct = (s / total) * 100;
                  const ePct = (e / total) * 100;
                  const gPct = (g / total) * 100;
                  return (
                    <div className="mt-1.5">
                      <div className="flex w-full h-2 rounded-full overflow-hidden bg-slate-100">
                        <div
                          className="h-full bg-blue-400 transition-all duration-500"
                          style={{ width: `${sPct}%` }}
                          title={`Structured: ${Math.round(s * 100)}%`}
                        />
                        <div
                          className="h-full bg-emerald-400 transition-all duration-500"
                          style={{ width: `${ePct}%` }}
                          title={`Embedding: ${Math.round(e * 100)}%`}
                        />
                        <div
                          className="h-full bg-purple-400 transition-all duration-500"
                          style={{ width: `${gPct}%` }}
                          title={`Graph: ${Math.round(g * 100)}%`}
                        />
                      </div>
                      <div className="flex justify-between mt-0.5">
                        <span className="text-[9px] text-blue-500 font-medium">{Math.round(s * 100)}%</span>
                        <span className="text-[9px] text-emerald-500 font-medium">{Math.round(e * 100)}%</span>
                        <span className="text-[9px] text-purple-500 font-medium">{Math.round(g * 100)}%</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className={`px-2 py-1 rounded-lg border text-xs font-bold ${scoreColor}`}>
                {pct}%
              </div>
            </button>
          );
        })}
      </div>

      {/* Score legend */}
      <div className="flex gap-3 mt-2 justify-end">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-[9px] text-slate-400">Structured</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-400" /><span className="text-[9px] text-slate-400">Embedding</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-400" /><span className="text-[9px] text-slate-400">Graph</span></div>
      </div>
    </div>
  );
}

// ─── Mini Graph Visualization ────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  School: "#3b82f6",   // blue
  Product: "#a855f7",  // purple
  Phase: "#6366f1",    // indigo
  Region: "#06b6d4",   // cyan
  Subject: "#f59e0b",  // amber
  Category: "#10b981", // emerald
  Trust: "#64748b",    // slate
};

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  properties?: Record<string, unknown>;
}

interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

function MiniGraph({ data }: { data: Record<string, unknown> }) {
  const nodes = (data.nodes || []) as GraphNode[];
  const links = (data.links || []) as GraphLink[];
  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force("charge")?.strength(-120);
      graphRef.current.d3Force("link")?.distance(60);
      // Auto-zoom to fit after initial render
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 30);
      }, 500);
    }
  }, []);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const label = node.label || node.id;
      const fontSize = 10 / globalScale;
      const r = 5;
      const color = NODE_COLORS[node.type || ""] || "#94a3b8";

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();

      // Label
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#334155";
      const displayLabel = label.length > 18 ? label.slice(0, 16) + "..." : label;
      ctx.fillText(displayLabel, node.x, node.y + r + 2 / globalScale);
    },
    []
  );

  if (nodes.length === 0) return null;

  const graphData = { nodes: [...nodes], links: [...links] };

  // Collect unique types for legend
  const types = Array.from(new Set(nodes.map((n) => n.type).filter(Boolean))) as string[];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-cyan-100 to-cyan-50 flex items-center justify-center">
          <svg className="w-3 h-3 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-600">Graph Neighbors</span>
        <span className="text-[10px] text-slate-400 ml-auto">{nodes.length} nodes, {links.length} links</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-slate-200/50 bg-white">
        <ForceGraph2D
          ref={graphRef}
          graphData={graphData}
          width={400}
          height={300}
          nodeCanvasObject={paintNode}
          nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => { // eslint-disable-line @typescript-eslint/no-explicit-any
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
          }}
          linkColor={() => "#cbd5e1"}
          linkWidth={1}
          linkDirectionalArrowLength={0}
          cooldownTicks={80}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      </div>

      {/* Type legend */}
      {types.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mt-2">
          {types.map((t) => (
            <div key={t} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NODE_COLORS[t] || "#94a3b8" }} />
              <span className="text-[10px] text-slate-400">{t}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Alternatives Network ───────────────────────────────────────────────────

function AlternativesVisual({ data }: { data: Record<string, unknown> }) {
  const onEntityClick = useContext(EntityClickContext);
  const dbAlts = (data.db_alternatives || []) as Array<{ alternative_product_id: string; entity_name?: string }>;
  const graphAlts = (data.graph_alternatives || []) as Array<{ entity_id: string; entity_name?: string }>;
  const total = (data.total as number) || 0;
  const productId = String(data.product_id || "");

  if (total === 0) return null;

  // Deduplicate
  const allAlts = new Map<string, string>();
  dbAlts.forEach((a) => allAlts.set(a.alternative_product_id, a.entity_name || a.alternative_product_id));
  graphAlts.forEach((a) => allAlts.set(a.entity_id, a.entity_name || a.entity_id));

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center">
          <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-600">Product Alternatives</span>
        <span className="text-[10px] text-slate-400 ml-auto">{allAlts.size} found</span>
      </div>

      {/* Hub-spoke layout */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Center node */}
        <div className="px-3 py-1.5 rounded-xl gradient-bg text-white text-xs font-semibold shadow-glow-brand/20 shrink-0">
          {productId}
        </div>

        {/* Arrow */}
        <svg className="w-6 h-6 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>

        {/* Alternative nodes */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from(allAlts.entries()).slice(0, 10).map(([id, name]) => (
            <button key={id} onClick={() => onEntityClick?.("product", id)} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/50 text-xs font-medium text-amber-700 hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm transition-all cursor-pointer">
              {name || id}
            </button>
          ))}
          {allAlts.size > 10 && (
            <div className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/50 text-xs text-slate-500">
              +{allAlts.size - 10} more
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Profile Summary Card ───────────────────────────────────────────────────

function ProfileCard({ data }: { data: Record<string, unknown> }) {
  const onEntityClick = useContext(EntityClickContext);
  const fields = (data.structured_fields || {}) as Record<string, unknown>;
  const name = String(data.entity_name || "");
  const type = String(data.entity_type || "");
  const entityId = String(data.entity_id || fields.entity_id || "");

  const keyFields = type === "school"
    ? ["phase", "type", "region", "ofsted_rating", "fsm_band", "size_band"]
    : ["primary_category", "pedagogy_style", "purchase_model", "user_rating", "num_of_reviews"];

  const fieldColors: Record<string, string> = {
    phase: "bg-blue-50 text-blue-700 border-blue-200/50",
    type: "bg-purple-50 text-purple-700 border-purple-200/50",
    region: "bg-cyan-50 text-cyan-700 border-cyan-200/50",
    ofsted_rating: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
    fsm_band: "bg-amber-50 text-amber-700 border-amber-200/50",
    primary_category: "bg-brand-50 text-brand-700 border-brand-200/50",
    pedagogy_style: "bg-violet-50 text-violet-700 border-violet-200/50",
    purchase_model: "bg-teal-50 text-teal-700 border-teal-200/50",
  };

  return (
    <button onClick={() => onEntityClick?.(type as "school" | "product", entityId)} className="block w-full text-left hover:bg-slate-50/50 -m-1 p-1 rounded-xl transition-colors group cursor-pointer">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-5 h-5 rounded-md flex items-center justify-center ${type === "school" ? "bg-gradient-to-br from-blue-100 to-blue-50" : "bg-gradient-to-br from-purple-100 to-purple-50"}`}>
          {type === "school" ? (
            <svg className="w-3 h-3 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
            </svg>
          ) : (
            <svg className="w-3 h-3 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          )}
        </div>
        <span className="text-xs font-semibold text-slate-700 group-hover:text-brand-600 transition-colors">{name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 capitalize">{type}</span>
        <svg className="w-3 h-3 text-slate-300 group-hover:text-brand-400 transition-colors ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {keyFields.map((key) => {
          const val = fields[key];
          if (!val) return null;
          const display = Array.isArray(val) ? val.join(", ") : String(val);
          const color = fieldColors[key] || "bg-slate-50 text-slate-600 border-slate-200/50";
          return (
            <span key={key} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium ${color}`}>
              <span className="opacity-60 capitalize">{key.replace(/_/g, " ")}:</span> {display}
            </span>
          );
        })}
      </div>
    </button>
  );
}

// ─── Peer Insights ──────────────────────────────────────────────────────────

function PeerInsights({ data }: { data: Record<string, unknown> }) {
  const peerCount = (data.peer_count as number) || 0;
  const popularProducts = (data.popular_products || []) as Array<{
    product_id: string;
    product_name: string;
    peer_count: number;
    avg_score: number;
  }>;

  if (peerCount === 0 && popularProducts.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-gradient-to-br from-teal-100 to-teal-50 flex items-center justify-center">
          <svg className="w-3 h-3 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-slate-600">Peer Schools</span>
        <span className="text-[10px] text-slate-400">{peerCount} similar schools</span>
      </div>

      {popularProducts.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Popular among peers</p>
          {popularProducts.slice(0, 5).map((p) => (
            <div key={p.product_id} className="flex items-center gap-2 p-2 rounded-lg bg-teal-50/50 border border-teal-100">
              <span className="text-xs font-medium text-slate-700 flex-1">{p.product_name || p.product_id}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-teal-100 text-teal-700 font-semibold">{p.peer_count} peers</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Match Map ──────────────────────────────────────────────────────────────

interface MatchConnection {
  school_attr: string;
  school_val: string;
  product_attr: string;
  product_val: string;
  score: number;
  dimension: string;
}

const DIM_SHORT: Record<string, string> = {
  phase_age_alignment: "Phase",
  subject_overlap: "Subjects",
  budget_fit: "Budget",
  pedagogy_fit: "Pedagogy",
  send_alignment: "SEND",
  sixth_form_alignment: "6th Form",
  impact_alignment: "Impact",
};

function truncateVal(v: string, max = 35): string {
  if (!v || v === "N/A") return "—";
  return v.length > max ? v.slice(0, max - 1) + "..." : v;
}

function MatchMap({ data }: { data: Record<string, unknown> }) {
  const onEntityClick = useContext(EntityClickContext);
  const school = data.school as { name: string; id: string } | undefined;
  const product = data.product as { name: string; id: string } | undefined;
  const connections = (data.connections || []) as MatchConnection[];
  const totalScore = (data.total_score as number) || 0;

  if (!school || !product || connections.length === 0) return null;

  const totalPct = Math.round(totalScore * 100);
  const totalColor = totalPct >= 70 ? "text-emerald-600" : totalPct >= 40 ? "text-amber-600" : "text-red-500";
  const totalBg = totalPct >= 70 ? "bg-emerald-50 border-emerald-200" : totalPct >= 40 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";

  const radarDims = connections.map(c => ({
    label: DIM_SHORT[c.dimension] || c.dimension,
    value: c.score,
    school_val: c.school_val || "—",
    product_val: c.product_val || "—",
  }));

  // Sort by score for the detail rows
  const sorted = [...connections].sort((a, b) => b.score - a.score);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => onEntityClick?.("school", school.id)} className="text-left group">
          <span className="text-[10px] text-slate-400 font-medium block">School</span>
          <span className="text-xs font-bold text-blue-700 group-hover:text-blue-500 transition-colors">{school.name}</span>
        </button>
        <div className={`px-3 py-1.5 rounded-xl border ${totalBg} ${totalColor} text-sm font-extrabold`}>
          {totalPct}% match
        </div>
        <button onClick={() => onEntityClick?.("product", product.id)} className="text-right group">
          <span className="text-[10px] text-slate-400 font-medium block">Product</span>
          <span className="text-xs font-bold text-purple-700 group-hover:text-purple-500 transition-colors">{product.name}</span>
        </button>
      </div>

      {/* Radar chart */}
      <MiniRadar dimensions={radarDims} size={220} />

      {/* Detailed dimension breakdown — shows actual values */}
      <div className="mt-3 pt-3 border-t border-slate-100">
        <div className="grid grid-cols-[1fr_auto_auto_1fr] gap-x-2 gap-y-1.5 items-center text-[11px]">
          {/* Column headers */}
          <div className="text-[9px] font-bold text-blue-500 uppercase tracking-wider pb-1">School</div>
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider text-center pb-1 col-span-2">Dimension</div>
          <div className="text-[9px] font-bold text-purple-500 uppercase tracking-wider text-right pb-1">Product</div>

          {sorted.map((conn, i) => {
            const pct = Math.round(conn.score * 100);
            const dotColor = pct >= 70 ? "bg-emerald-400" : pct >= 40 ? "bg-amber-400" : "bg-red-300";
            const scoreColor = pct >= 70 ? "text-emerald-600" : pct >= 40 ? "text-amber-600" : "text-red-400";
            const schoolVal = truncateVal(conn.school_val);
            const productVal = truncateVal(conn.product_val);

            return (
              <div key={conn.dimension} className="contents animate-fade-in" style={{ animationDelay: `${i * 50}ms`, animationFillMode: "backwards" }}>
                {/* School value */}
                <div className="text-slate-600 truncate pr-1" title={conn.school_val}>
                  {schoolVal}
                </div>
                {/* Dimension + score */}
                <div className="flex items-center gap-1 justify-center shrink-0">
                  <div className={`w-1.5 h-1.5 rounded-full ${dotColor} shrink-0`} />
                  <span className="text-slate-500 font-medium whitespace-nowrap">{DIM_SHORT[conn.dimension]}</span>
                </div>
                <div className={`font-bold ${scoreColor} text-right shrink-0 w-8`}>{pct}%</div>
                {/* Product value */}
                <div className="text-slate-600 truncate text-right pl-1" title={conn.product_val}>
                  {productVal}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Renderer ──────────────────────────────────────────────────────────

export function ToolVisual({ toolCall }: { toolCall: ToolCall }) {
  const data = toolCall.resultData;
  if (!data || toolCall.status !== "done") return null;

  switch (toolCall.name) {
    case "get_educational_impact":
      return <ImpactBars data={data} />;
    case "compare_impact_scores":
      return <ImpactComparison data={data} />;
    case "find_product_recommendations":
      return <RecommendationCards data={data} />;
    case "get_product_alternatives":
      return <AlternativesVisual data={data} />;
    case "get_entity_profile":
      return <ProfileCard data={data} />;
    case "find_peer_insights":
      return <PeerInsights data={data} />;
    case "generate_match_report":
      return <RecommendationCards data={data} />;
    case "get_graph_neighbors":
      return <MiniGraph data={data} />;
    case "visualize_match":
      return <MatchMap data={data} />;
    default:
      return null;
  }
}

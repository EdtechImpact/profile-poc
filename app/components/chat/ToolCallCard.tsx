"use client";

import { useState } from "react";
import { ToolCall } from "@/app/hooks/useChat";

const TOOL_META: Record<string, { label: string; color: string; bg: string }> = {
  get_entity_profile:          { label: "Profile Lookup",      color: "text-blue-600",    bg: "bg-blue-50 border-blue-200/50" },
  find_similar_entities:       { label: "Find Similar",        color: "text-purple-600",  bg: "bg-purple-50 border-purple-200/50" },
  compare_entities:            { label: "Compare",             color: "text-indigo-600",  bg: "bg-indigo-50 border-indigo-200/50" },
  get_graph_neighbors:         { label: "Graph Explore",       color: "text-cyan-600",    bg: "bg-cyan-50 border-cyan-200/50" },
  find_product_recommendations:{ label: "Recommendations",     color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200/50" },
  explain_match:               { label: "Match Explain",       color: "text-violet-600",  bg: "bg-violet-50 border-violet-200/50" },
  find_peer_insights:          { label: "Peer Insights",       color: "text-teal-600",    bg: "bg-teal-50 border-teal-200/50" },
  get_product_alternatives:    { label: "Alternatives",        color: "text-amber-600",   bg: "bg-amber-50 border-amber-200/50" },
  get_educational_impact:      { label: "Impact Scores",       color: "text-rose-600",    bg: "bg-rose-50 border-rose-200/50" },
  compare_impact_scores:       { label: "Impact Compare",      color: "text-pink-600",    bg: "bg-pink-50 border-pink-200/50" },
  generate_match_report:       { label: "Match Report",        color: "text-brand-600",   bg: "bg-brand-50 border-brand-200/50" },
};

const DEFAULT_META = { label: "Tool", color: "text-slate-600", bg: "bg-slate-50 border-slate-200/50" };

export function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TOOL_META[toolCall.name] || DEFAULT_META;
  const isRunning = toolCall.status === "running";

  return (
    <div className={`my-1.5 rounded-xl border ${meta.bg} overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        {isRunning ? (
          <div className={`w-3.5 h-3.5 rounded-full border-2 ${meta.color} border-current border-t-transparent animate-spin shrink-0`} />
        ) : (
          <svg className={`w-3.5 h-3.5 ${meta.color} shrink-0`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        )}
        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
        {toolCall.summary && (
          <span className="text-xs text-slate-400 truncate ml-1">&mdash; {toolCall.summary}</span>
        )}
        <svg
          className={`w-3 h-3 ml-auto text-slate-300 transition-transform shrink-0 ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 pb-2.5 border-t border-current/5">
          <pre className="text-[10px] mt-2 overflow-x-auto whitespace-pre-wrap text-slate-500 font-mono leading-relaxed">
            {JSON.stringify(toolCall.input, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

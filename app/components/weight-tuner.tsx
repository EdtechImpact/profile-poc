"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export interface HybridWeights {
  [key: string]: number;
  structured: number;
  embedding: number;
  graph: number;
}

export interface DimensionWeights {
  [key: string]: number;
  phase_age_alignment: number;
  subject_overlap: number;
  budget_fit: number;
  pedagogy_fit: number;
  send_alignment: number;
  sixth_form_alignment: number;
}

export const DEFAULT_HYBRID: HybridWeights = { structured: 0.40, embedding: 0.30, graph: 0.30 };
export const DEFAULT_DIMENSIONS: DimensionWeights = {
  phase_age_alignment: 0.30,
  subject_overlap: 0.25,
  budget_fit: 0.15,
  pedagogy_fit: 0.15,
  send_alignment: 0.10,
  sixth_form_alignment: 0.05,
};

interface WeightTunerProps {
  hybridWeights: HybridWeights;
  dimensionWeights: DimensionWeights;
  onHybridChange: (w: HybridWeights) => void;
  onDimensionChange: (w: DimensionWeights) => void;
  onReset: () => void;
}

const HYBRID_META = [
  { key: "structured" as const, label: "Structured", color: "#3b82f6", desc: "Attribute matching" },
  { key: "embedding" as const, label: "Embedding", color: "#34d399", desc: "Semantic similarity" },
  { key: "graph" as const, label: "Graph", color: "#a855f7", desc: "Relationship overlap" },
];

const DIM_META = [
  { key: "phase_age_alignment" as const, label: "Phase/Age", color: "#3b82f6" },
  { key: "subject_overlap" as const, label: "Subjects", color: "#a855f7" },
  { key: "budget_fit" as const, label: "Budget", color: "#f59e0b" },
  { key: "pedagogy_fit" as const, label: "Pedagogy", color: "#34d399" },
  { key: "send_alignment" as const, label: "SEND", color: "#f43f5e" },
  { key: "sixth_form_alignment" as const, label: "6th Form", color: "#94a3b8" },
];

function adjustWeights<T extends Record<string, number>>(weights: T, changedKey: string, newVal: number): T {
  const others = Object.keys(weights).filter((k) => k !== changedKey);
  const remaining = 1 - newVal;
  const othersSum = others.reduce((s, k) => s + weights[k], 0);
  const result = { ...weights, [changedKey]: newVal } as T;
  if (othersSum > 0) {
    for (const k of others) {
      (result as Record<string, number>)[k] = (weights[k] / othersSum) * remaining;
    }
  } else {
    const each = remaining / others.length;
    for (const k of others) {
      (result as Record<string, number>)[k] = each;
    }
  }
  return result;
}

export default function WeightTuner({ hybridWeights, dimensionWeights, onHybridChange, onDimensionChange, onReset }: WeightTunerProps) {
  const [open, setOpen] = useState(false);

  const isDefault =
    Math.abs(hybridWeights.structured - DEFAULT_HYBRID.structured) < 0.01 &&
    Math.abs(hybridWeights.embedding - DEFAULT_HYBRID.embedding) < 0.01 &&
    Math.abs(dimensionWeights.phase_age_alignment - DEFAULT_DIMENSIONS.phase_age_alignment) < 0.01 &&
    Math.abs(dimensionWeights.subject_overlap - DEFAULT_DIMENSIONS.subject_overlap) < 0.01;

  return (
    <div className="glass-card overflow-hidden transition-all duration-300">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <span className="text-xs font-semibold text-slate-700">Customize Scoring</span>
          {!isDefault && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 font-bold border border-brand-100">
              Custom
            </span>
          )}
        </div>
        <motion.svg
          className="w-4 h-4 text-slate-400"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </motion.svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {/* Hybrid weights */}
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Signal Weights
                </div>
                <div className="space-y-2">
                  {HYBRID_META.map((h) => (
                    <div key={h.key} className="flex items-center gap-3">
                      <div className="w-16 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: h.color }} />
                        <span className="text-[10px] font-medium text-slate-600">{h.label}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round(hybridWeights[h.key] * 100)}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          onHybridChange(adjustWeights(hybridWeights, h.key, Math.min(v, 0.95)));
                        }}
                        className="flex-1 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: h.color }}
                      />
                      <span className="text-[10px] font-bold text-slate-700 tabular-nums w-8 text-right">
                        {Math.round(hybridWeights[h.key] * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimension weights */}
              <div>
                <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Dimension Weights
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {DIM_META.map((d) => (
                    <div key={d.key} className="flex items-center gap-2">
                      <span className="text-[9px] font-medium text-slate-500 w-14 truncate">{d.label}</span>
                      <input
                        type="range"
                        min={0}
                        max={60}
                        value={Math.round(dimensionWeights[d.key] * 100)}
                        onChange={(e) => {
                          const v = Number(e.target.value) / 100;
                          onDimensionChange(adjustWeights(dimensionWeights, d.key, Math.min(v, 0.60)));
                        }}
                        className="flex-1 h-1 bg-slate-200 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: d.color }}
                      />
                      <span className="text-[9px] font-bold text-slate-600 tabular-nums w-6 text-right">
                        {Math.round(dimensionWeights[d.key] * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reset button */}
              {!isDefault && (
                <button
                  onClick={onReset}
                  className="text-[10px] font-semibold text-brand-500 hover:text-brand-700 transition-colors flex items-center gap-1"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Reset to defaults
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

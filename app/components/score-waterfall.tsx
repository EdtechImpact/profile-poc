"use client";

import React from "react";
import { motion } from "framer-motion";

interface WaterfallProps {
  breakdown: Record<string, number>;
  compact?: boolean;
}

const DIMENSIONS = [
  { key: "phase_age_alignment", label: "Phase/Age", color: "#3b82f6", weight: 0.30 },
  { key: "subject_overlap", label: "Subjects", color: "#a855f7", weight: 0.25 },
  { key: "budget_fit", label: "Budget", color: "#f59e0b", weight: 0.15 },
  { key: "pedagogy_fit", label: "Pedagogy", color: "#34d399", weight: 0.15 },
  { key: "send_alignment", label: "SEND", color: "#f43f5e", weight: 0.10 },
  { key: "sixth_form_alignment", label: "6th Form", color: "#94a3b8", weight: 0.05 },
];

export default React.memo(function ScoreWaterfall({ breakdown, compact = true }: WaterfallProps) {
  if (!breakdown || Object.keys(breakdown).length === 0) return null;

  const segments = DIMENSIONS.map((dim) => {
    const raw = breakdown[dim.key] ?? 0;
    const contribution = raw * dim.weight * 100;
    return { ...dim, raw, contribution };
  });

  const totalScore = Math.round(segments.reduce((s, d) => s + d.contribution, 0));
  const maxWidth = Math.max(totalScore, 1);

  let cumulative = 0;

  return (
    <div className={compact ? "mt-2" : "mt-4"}>
      {!compact && (
        <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5">
          Score Build-up
        </div>
      )}
      <div className="relative">
        {/* Track */}
        <div className={`w-full bg-slate-100 rounded-full overflow-hidden ${compact ? "h-5" : "h-7"}`}>
          <div className="flex h-full">
            {segments.map((seg, i) => {
              const left = cumulative;
              cumulative += seg.contribution;
              if (seg.contribution < 0.5) return null;
              return (
                <motion.div
                  key={seg.key}
                  className="h-full relative group"
                  initial={{ width: 0 }}
                  animate={{ width: `${(seg.contribution / maxWidth) * 100}%` }}
                  transition={{ delay: i * 0.12, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  style={{ backgroundColor: seg.color }}
                  title={`${seg.label}: ${seg.raw >= 0 ? Math.round(seg.raw * 100) : 0}% × ${Math.round(seg.weight * 100)}% = ${Math.round(seg.contribution)}pts`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {seg.label}: {Math.round(seg.raw * 100)}% × {Math.round(seg.weight * 100)}%
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                  </div>
                  {!compact && seg.contribution > 4 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white/90">
                      +{Math.round(seg.contribution)}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Final score badge */}
        <motion.div
          className="absolute -right-1 top-1/2 -translate-y-1/2 translate-x-full ml-2"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8, duration: 0.3 }}
        >
          <span className={`font-extrabold tabular-nums ${compact ? "text-xs" : "text-sm"} ${totalScore >= 60 ? "text-emerald-600" : totalScore >= 40 ? "text-amber-600" : "text-red-500"}`}>
            {totalScore}
          </span>
        </motion.div>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
          {segments.filter(s => s.contribution >= 0.5).map((seg) => (
            <span key={seg.key} className="flex items-center gap-1 text-[9px] text-slate-500">
              <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: seg.color }} />
              {seg.label} <span className="font-semibold text-slate-700">+{Math.round(seg.contribution)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

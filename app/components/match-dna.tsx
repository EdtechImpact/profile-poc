"use client";

import { motion } from "framer-motion";
import { useRef, useEffect, useState } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
interface MatchDNAProps {
  schoolFields: Record<string, any>;
  productFields: Record<string, any>;
  breakdown: Record<string, number>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface Connection {
  schoolLabel: string;
  schoolValue: string;
  productLabel: string;
  productValue: string;
  scoreKey: string;
  score: number;
}

const SCORE_COLORS = {
  high: { stroke: "#34d399", glow: "rgba(52,211,153,0.3)" },
  mid: { stroke: "#fbbf24", glow: "rgba(251,191,36,0.25)" },
  low: { stroke: "#f87171", glow: "rgba(248,113,113,0.2)" },
};

function getScoreStyle(score: number) {
  if (score >= 0.7) return { ...SCORE_COLORS.high, width: 2.5, dash: "none" };
  if (score >= 0.4) return { ...SCORE_COLORS.mid, width: 1.8, dash: "none" };
  return { ...SCORE_COLORS.low, width: 1.2, dash: "6 4" };
}

function formatValue(val: unknown): string {
  if (Array.isArray(val)) return val.slice(0, 3).join(", ") + (val.length > 3 ? ` +${val.length - 3}` : "");
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (val === null || val === undefined) return "—";
  return String(val);
}

export default function MatchDNA({ schoolFields, productFields, breakdown }: MatchDNAProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<{ left: DOMRect[]; right: DOMRect[] } | null>(null);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);

  const connections: Connection[] = [
    {
      schoolLabel: "Phase",
      schoolValue: formatValue(schoolFields.phase),
      productLabel: "Age Range",
      productValue: formatValue(productFields.age_range),
      scoreKey: "phase_age_alignment",
      score: breakdown.phase_age_alignment ?? 0,
    },
    {
      schoolLabel: "Tech Needs",
      schoolValue: formatValue(schoolFields.likely_tech_needs || schoolFields.school_character),
      productLabel: "Subjects",
      productValue: formatValue(productFields.subjects),
      scoreKey: "subject_overlap",
      score: breakdown.subject_overlap ?? 0,
    },
    {
      schoolLabel: "FSM Band",
      schoolValue: formatValue(schoolFields.fsm_band),
      productLabel: "Pricing",
      productValue: formatValue(productFields.purchase_model),
      scoreKey: "budget_fit",
      score: breakdown.budget_fit ?? 0,
    },
    {
      schoolLabel: "Character",
      schoolValue: formatValue(schoolFields.school_character),
      productLabel: "Pedagogy",
      productValue: formatValue(productFields.pedagogy_style),
      scoreKey: "pedagogy_fit",
      score: breakdown.pedagogy_fit ?? 0,
    },
    {
      schoolLabel: "SEND Focus",
      schoolValue: schoolFields.send_provision || schoolFields.type || "—",
      productLabel: "SEND Suitability",
      productValue: formatValue(productFields.send_suitability),
      scoreKey: "send_alignment",
      score: breakdown.send_alignment ?? 0,
    },
    {
      schoolLabel: "Sixth Form",
      schoolValue: schoolFields.has_sixth_form ? "Yes" : "No",
      productLabel: "16+ Coverage",
      productValue: (productFields.age_range || []).some((r: string) => r && (r.includes("16") || r.includes("18") || r.includes("19"))) ? "Yes" : "No",
      scoreKey: "sixth_form_alignment",
      score: breakdown.sixth_form_alignment ?? 0,
    },
  ];

  // Measure pill positions
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current.getBoundingClientRect();
    const leftEls = containerRef.current.querySelectorAll("[data-side='left']");
    const rightEls = containerRef.current.querySelectorAll("[data-side='right']");
    setContainerRect(container);
    setPositions({
      left: Array.from(leftEls).map((el) => el.getBoundingClientRect()),
      right: Array.from(rightEls).map((el) => el.getBoundingClientRect()),
    });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full py-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">School</span>
        </div>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Match DNA</span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Product</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Connection rows */}
      <div className="space-y-3">
        {connections.map((conn, i) => {
          const style = getScoreStyle(conn.score);
          const pct = Math.round(conn.score * 100);
          return (
            <motion.div
              key={conn.scoreKey}
              className="flex items-center gap-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
            >
              {/* Left pill (school) */}
              <div
                data-side="left"
                className="w-[38%] flex flex-col items-end"
              >
                <span className="text-[9px] text-slate-400 font-medium">{conn.schoolLabel}</span>
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md px-2 py-0.5 max-w-full truncate text-right">
                  {conn.schoolValue}
                </span>
              </div>

              {/* Connection line + score */}
              <div className="flex-1 flex items-center justify-center relative min-w-[80px]">
                <svg className="w-full h-6 overflow-visible" viewBox="0 0 100 24" preserveAspectRatio="none">
                  {/* Glow filter */}
                  <defs>
                    <filter id={`glow-${conn.scoreKey}`}>
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.path
                    d="M 2 12 C 30 12, 70 12, 98 12"
                    fill="none"
                    stroke={style.stroke}
                    strokeWidth={style.width}
                    strokeDasharray={style.dash}
                    strokeLinecap="round"
                    filter={conn.score >= 0.7 ? `url(#glow-${conn.scoreKey})` : undefined}
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ delay: 0.3 + i * 0.15, duration: 0.6, ease: "easeOut" }}
                  />
                </svg>
                {/* Score badge */}
                <motion.div
                  className="absolute"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 + i * 0.15, duration: 0.3 }}
                >
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                      conn.score >= 0.7
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : conn.score >= 0.4
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-red-50 text-red-600 border-red-200"
                    }`}
                  >
                    {pct}%
                  </span>
                </motion.div>
              </div>

              {/* Right pill (product) */}
              <div
                data-side="right"
                className="w-[38%] flex flex-col items-start"
              >
                <span className="text-[9px] text-slate-400 font-medium">{conn.productLabel}</span>
                <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 max-w-full truncate">
                  {conn.productValue}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-100">
        <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
          <span className="w-6 h-0.5 bg-emerald-400 rounded-full" /> Strong match
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
          <span className="w-6 h-0.5 bg-amber-400 rounded-full" /> Partial match
        </span>
        <span className="flex items-center gap-1.5 text-[9px] text-slate-400">
          <span className="w-6 h-0.5 bg-red-400 rounded-full border-dashed" style={{ borderTop: "1px dashed #f87171", height: 0 }} /> Weak/No match
        </span>
      </div>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";

interface GraphBridgeProps {
  schoolName: string;
  schoolId: string;
  productName: string;
  productId: string;
  sharedNodes: string[];
}

const NODE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  phase: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  region: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  subject: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  category: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  trust: { bg: "bg-slate-100", text: "text-slate-600", border: "border-slate-200" },
  default: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
};

function guessNodeType(name: string): string {
  const lower = name.toLowerCase();
  if (["primary", "secondary", "all-through", "nursery", "special", "16 plus"].some(p => lower.includes(p))) return "phase";
  if (["north", "south", "east", "west", "london", "midlands", "england"].some(r => lower.includes(r))) return "region";
  if (["maths", "math", "science", "english", "literacy", "computing", "art", "music", "history", "geography", "languages", "pe", "design", "technology", "stem", "reading", "writing", "phonics"].some(s => lower.includes(s))) return "subject";
  if (["assessment", "learning", "management", "platform", "curriculum", "tool", "resource"].some(c => lower.includes(c))) return "category";
  return "default";
}

export default function GraphBridge({ schoolName, schoolId, productName, productId, sharedNodes }: GraphBridgeProps) {
  if (!sharedNodes || sharedNodes.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-100/60">
      <div className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Graph Connection
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {/* School node */}
        <motion.div
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href={`/schools/${schoolId}`}
            className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md font-semibold border border-blue-200 hover:bg-blue-200 transition-colors truncate max-w-[100px] inline-block"
          >
            {schoolName.length > 15 ? schoolName.slice(0, 15) + "..." : schoolName}
          </Link>
        </motion.div>

        {/* Arrow */}
        <motion.svg
          className="w-4 h-4 text-slate-300 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
        </motion.svg>

        {/* Shared nodes */}
        {sharedNodes.slice(0, 5).map((node, i) => {
          const type = guessNodeType(node);
          const c = NODE_COLORS[type];
          return (
            <motion.span
              key={node}
              className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${c.bg} ${c.text} ${c.border}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.3 }}
            >
              {node}
            </motion.span>
          );
        })}
        {sharedNodes.length > 5 && (
          <span className="text-[9px] text-slate-400">+{sharedNodes.length - 5} more</span>
        )}

        {/* Arrow */}
        <motion.svg
          className="w-4 h-4 text-slate-300 flex-shrink-0"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
        </motion.svg>

        {/* Product node */}
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 + Math.min(sharedNodes.length, 5) * 0.1, duration: 0.3 }}
        >
          <Link
            href={`/products/${productId}`}
            className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md font-semibold border border-emerald-200 hover:bg-emerald-200 transition-colors truncate max-w-[100px] inline-block"
          >
            {productName.length > 15 ? productName.slice(0, 15) + "..." : productName}
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

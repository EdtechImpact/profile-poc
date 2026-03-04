"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface Profile {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  structured_fields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  profile_text: string;
}

export default function ComparePageWrapper() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-400">Loading...</div>}>
      <ComparePage />
    </Suspense>
  );
}

function ComparePage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "school";
  const initialIds = searchParams.get("ids") || "";

  const [entityType, setEntityType] = useState(initialType);
  const [idsInput, setIdsInput] = useState(initialIds);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadProfiles = async () => {
    const ids = idsInput.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length < 2) return;
    setLoading(true);
    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const res = await fetch(`/api/profiles/${entityType}/${id}`);
          const data = await res.json();
          return data.profile;
        })
      );
      setProfiles(results.filter(Boolean));
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialIds && initialIds.includes(",")) {
      loadProfiles();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allKeys = [...new Set(profiles.flatMap((p) => Object.keys(p.structured_fields)))];

  // Count matches/differences
  const matchCount = allKeys.filter((key) => {
    const values = profiles.map((p) => {
      const v = p.structured_fields[key];
      return Array.isArray(v) ? v.join(", ") : String(v ?? "-");
    });
    return values.every((v) => v === values[0]);
  }).length;
  const diffCount = allKeys.length - matchCount;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Compare</h1>
      <p className="text-slate-500 text-sm mb-6">Side-by-side profile comparison with diff highlighting</p>

      {/* Controls */}
      <div className="glass-card p-4 mb-6">
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              <option value="school">School</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Entity IDs (comma-separated)</label>
            <input
              type="text"
              value={idsInput}
              onChange={(e) => setIdsInput(e.target.value)}
              placeholder="e.g. 100000,100001,100002"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              onKeyDown={(e) => e.key === "Enter" && loadProfiles()}
            />
          </div>
          <button
            onClick={loadProfiles}
            disabled={loading}
            className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading...</>
            ) : "Compare"}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {profiles.length >= 2 && (
        <div className="flex gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300" />
            <span className="text-slate-600">{matchCount} matching fields</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-300" />
            <span className="text-slate-600">{diffCount} differences</span>
          </div>
        </div>
      )}

      {/* Comparison table */}
      {profiles.length >= 2 ? (
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48 sticky left-0 bg-slate-50/80 backdrop-blur-sm z-10">
                  Field
                </th>
                {profiles.map((p) => (
                  <th key={p.entity_id} className="text-left px-4 py-3 min-w-[220px]">
                    <Link
                      href={`/${entityType === "school" ? "schools" : "products"}/${p.entity_id}`}
                      className="text-sm font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      {p.entity_name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Summary row */}
              <tr className="border-b border-slate-100/60">
                <td className="px-4 py-3 text-xs text-slate-400 font-semibold uppercase tracking-wider sticky left-0 bg-white/80 backdrop-blur-sm z-10">Summary</td>
                {profiles.map((p) => (
                  <td key={p.entity_id} className="px-4 py-3 text-[11px] text-slate-600 leading-relaxed">
                    {p.profile_text || "-"}
                  </td>
                ))}
              </tr>

              {/* Fields */}
              {allKeys.map((key) => {
                const values = profiles.map((p) => {
                  const v = p.structured_fields[key];
                  return Array.isArray(v) ? v.join(", ") : String(v ?? "-");
                });
                const allSame = values.every((v) => v === values[0]);

                return (
                  <tr key={key} className={`border-b border-slate-50/60 transition-colors ${!allSame ? "bg-amber-50/40" : "hover:bg-slate-50/50"}`}>
                    <td className={`px-4 py-2.5 text-xs capitalize sticky left-0 z-10 backdrop-blur-sm ${!allSame ? "text-amber-700 font-semibold bg-amber-50/40" : "text-slate-400 bg-white/80"}`}>
                      {key.replace(/_/g, " ")}
                      {!allSame && (
                        <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                    </td>
                    {values.map((v, i) => (
                      <td key={i} className={`px-4 py-2.5 text-xs ${!allSame ? "font-medium text-slate-800" : "text-slate-600"}`}>
                        {!allSame ? <span className="keyword-match">{v}</span> : v}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : profiles.length === 1 ? (
        <div className="text-center py-20 text-slate-400">
          Need at least 2 entities to compare. Add more IDs separated by commas.
        </div>
      ) : !loading ? (
        <div className="text-center py-20 text-slate-400">
          Enter 2 or more entity IDs to compare their profiles side by side.
        </div>
      ) : null}
    </div>
  );
}

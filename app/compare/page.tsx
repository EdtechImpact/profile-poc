"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import EntitySearchSelect from "../components/entity-search";

interface Profile {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  structured_fields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  profile_text: string;
}

interface SelectedEntity {
  id: string;
  name: string;
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
  const [selected, setSelected] = useState<SelectedEntity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  // Populate selected from URL params on mount
  useEffect(() => {
    if (initialIds) {
      const ids = initialIds.split(",").map((s) => s.trim()).filter(Boolean);
      // Fetch names for the IDs
      Promise.all(
        ids.map(async (id) => {
          try {
            const res = await fetch(`/api/profiles/${initialType}/${id}`);
            const data = await res.json();
            return { id, name: data.profile?.entity_name || id };
          } catch {
            return { id, name: id };
          }
        })
      ).then((entities) => {
        setSelected(entities);
        if (entities.length >= 2) {
          loadProfilesFromIds(entities.map((e) => e.id));
        }
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadProfilesFromIds = async (ids: string[]) => {
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

  const loadProfiles = () => {
    loadProfilesFromIds(selected.map((s) => s.id));
  };

  const handleAddEntity = (id: string, name: string) => {
    if (selected.some((s) => s.id === id)) return; // prevent duplicates
    setSelected((prev) => [...prev, { id, name }]);
  };

  const handleRemoveEntity = (id: string) => {
    setSelected((prev) => prev.filter((s) => s.id !== id));
  };

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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in-down">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-purple-600 flex items-center justify-center shadow-glow-purple">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Compare</h1>
          <p className="text-slate-500 text-sm">Side-by-side profile comparison with diff highlighting</p>
        </div>
      </div>

      {/* Controls */}
      <div className="glass-card p-5 mb-6 overflow-visible relative z-20 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <div className="flex gap-3 items-end mb-4">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Type</label>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setSelected([]); setProfiles([]); }}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all cursor-pointer"
            >
              <option value="school">School</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Add entity to compare</label>
            <EntitySearchSelect
              entityType={entityType}
              onSelect={handleAddEntity}
              placeholder={`Search ${entityType}s by name to add...`}
            />
          </div>
        </div>

        {/* Selected entities chips */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map((entity, i) => (
              <div
                key={entity.id}
                className="flex items-center gap-2 px-3 py-1.5 bg-brand-50 border border-brand-200 rounded-xl text-sm animate-scale-in"
                style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}
              >
                <span className="font-medium text-brand-700">{entity.name}</span>
                <span className="text-[10px] text-brand-400 font-mono">{entity.id}</span>
                <button
                  onClick={() => handleRemoveEntity(entity.id)}
                  className="text-brand-400 hover:text-red-500 transition-colors ml-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={loadProfiles}
          disabled={loading || selected.length < 2}
          className="w-full px-6 py-2.5 gradient-bg text-white rounded-xl text-sm font-semibold hover:shadow-glow-brand disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading...</>
          ) : (
            <>Compare {selected.length} {entityType}s</>
          )}
        </button>
        {selected.length < 2 && selected.length > 0 && (
          <p className="text-xs text-slate-400 mt-2 text-center">Add at least 2 entities to compare</p>
        )}
      </div>

      {/* Stats bar */}
      {profiles.length >= 2 && (
        <div className="flex gap-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse-soft" />
            <span className="text-xs font-semibold text-emerald-700">{matchCount} matching</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse-soft" />
            <span className="text-xs font-semibold text-amber-700">{diffCount} differences</span>
          </div>
          <div className="flex-1" />
          <div className="text-[10px] text-slate-400 self-center">
            Comparing {profiles.length} entities
          </div>
        </div>
      )}

      {/* Comparison table */}
      {profiles.length >= 2 ? (
        <div className="glass-card overflow-x-auto animate-fade-in-up" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50/90 to-slate-50/50 border-b border-slate-200/60">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider w-48 sticky left-0 bg-slate-50/95 backdrop-blur-sm z-10">
                  Field
                </th>
                {profiles.map((p) => (
                  <th key={p.entity_id} className="text-left px-4 py-3.5 min-w-[220px]">
                    <Link
                      href={`/${entityType === "school" ? "schools" : "products"}/${p.entity_id}`}
                      className="text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
                    >
                      {p.entity_name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Summary row */}
              <tr className="border-b border-slate-100/60 bg-slate-50/30">
                <td className="px-4 py-3.5 text-xs text-slate-400 font-semibold uppercase tracking-wider sticky left-0 bg-slate-50/95 backdrop-blur-sm z-10">
                  <span className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    Summary
                  </span>
                </td>
                {profiles.map((p) => (
                  <td key={p.entity_id} className="px-4 py-3.5 text-[11px] text-slate-600 leading-relaxed">
                    {p.profile_text || "-"}
                  </td>
                ))}
              </tr>

              {/* Fields */}
              {allKeys.map((key, i) => {
                const values = profiles.map((p) => {
                  const v = p.structured_fields[key];
                  return Array.isArray(v) ? v.join(", ") : String(v ?? "-");
                });
                const allSame = values.every((v) => v === values[0]);

                return (
                  <tr
                    key={key}
                    className={`border-b border-slate-50/60 transition-all duration-200 animate-fade-in ${!allSame ? "bg-amber-50/30 hover:bg-amber-50/50" : "hover:bg-slate-50/50"}`}
                    style={{ animationDelay: `${0.25 + i * 0.02}s`, animationFillMode: "both" }}
                  >
                    <td className={`px-4 py-2.5 text-xs capitalize sticky left-0 z-10 backdrop-blur-sm ${!allSame ? "text-amber-700 font-semibold bg-amber-50/80" : "text-slate-400 bg-white/90"}`}>
                      <span className="flex items-center gap-1.5">
                        {key.replace(/_/g, " ")}
                        {!allSame && (
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse-soft" />
                        )}
                      </span>
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
      ) : !loading && profiles.length === 0 ? (
        <div className="text-center py-20 text-slate-400 animate-fade-in">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Search and select 2 or more entities above to compare their profiles side by side.
        </div>
      ) : null}
    </div>
  );
}

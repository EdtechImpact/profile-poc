// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { EntityDetailModal } from "@/app/components/shared/EntityDetailModal";

interface Profile {
  id: number;
  entity_id: string;
  entity_name: string;
  structured_fields: Record<string, any>;
  profiled_at: string;
}

type SortKey = "name-az" | "name-za" | "pedagogy" | "send" | "school-types" | "recent";

const PEDAGOGY_THEME: Record<string, { accent: string; bg: string; light: string; dot: string }> = {
  adaptive: { accent: "#8b5cf6", bg: "bg-violet-500", light: "bg-violet-50 text-violet-700", dot: "bg-violet-400" },
  gamified: { accent: "#f59e0b", bg: "bg-amber-500", light: "bg-amber-50 text-amber-700", dot: "bg-amber-400" },
  collaborative: { accent: "#3b82f6", bg: "bg-blue-500", light: "bg-blue-50 text-blue-700", dot: "bg-blue-400" },
  inquiry: { accent: "#10b981", bg: "bg-emerald-500", light: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-400" },
  blended: { accent: "#06b6d4", bg: "bg-cyan-500", light: "bg-cyan-50 text-cyan-700", dot: "bg-cyan-400" },
  assessment: { accent: "#f43f5e", bg: "bg-rose-500", light: "bg-rose-50 text-rose-700", dot: "bg-rose-400" },
  immersive: { accent: "#a855f7", bg: "bg-purple-500", light: "bg-purple-50 text-purple-700", dot: "bg-purple-400" },
  project: { accent: "#14b8a6", bg: "bg-teal-500", light: "bg-teal-50 text-teal-700", dot: "bg-teal-400" },
  default: { accent: "#6366f1", bg: "bg-indigo-500", light: "bg-indigo-50 text-indigo-700", dot: "bg-indigo-400" },
};

function getPedagogyKey(pedagogy: string): string {
  const p = (pedagogy || "").toLowerCase();
  if (p.includes("adaptive") || p.includes("personali")) return "adaptive";
  if (p.includes("gamif") || p.includes("game")) return "gamified";
  if (p.includes("collaborat") || p.includes("peer")) return "collaborative";
  if (p.includes("inquiry") || p.includes("storytell")) return "inquiry";
  if (p.includes("blend") || p.includes("hybrid")) return "blended";
  if (p.includes("assessment") || p.includes("track") || p.includes("analys")) return "assessment";
  if (p.includes("immers") || p.includes("project")) return "project";
  return "default";
}

function getTheme(pedagogy: string) {
  return PEDAGOGY_THEME[getPedagogyKey(pedagogy)] || PEDAGOGY_THEME.default;
}

function getPedagogyLabel(style: string): string {
  if (!style) return "";
  // Capitalize first letter and truncate
  const label = style.charAt(0).toUpperCase() + style.slice(1);
  return label.length > 30 ? label.slice(0, 28) + "..." : label;
}

const SEND_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  "SEND focused": { label: "SEND Focused", color: "bg-teal-50 text-teal-700 border-teal-200", icon: "●●●" },
  "some SEND features": { label: "Some SEND", color: "bg-slate-50 text-slate-500 border-slate-200", icon: "●●○" },
  "not designed": { label: "Not SEND", color: "bg-gray-50 text-gray-400 border-gray-200", icon: "●○○" },
};

export default function ProductsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(value), 200);
  }, []);
  const [pedagogyFilter, setPedagogyFilter] = useState("");
  const [sendFilter, setSendFilter] = useState("");
  const [schoolTypeFilter, setSchoolTypeFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name-az");
  const [selectedEntity, setSelectedEntity] = useState<{ type: "school" | "product"; id: string } | null>(null);

  const handleNavigate = useCallback((type: "school" | "product", id: string) => {
    setSelectedEntity({ type, id });
  }, []);

  useEffect(() => {
    fetch("/api/profiles/search?type=product&q=&limit=500")
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles || []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const filterOptions = useMemo(() => {
    const pedagogies = new Set<string>();
    const sendTypes = new Set<string>();
    const schoolTypes = new Set<string>();
    for (const p of profiles) {
      const sf = p.structured_fields;
      if (sf.pedagogy_style) pedagogies.add(sf.pedagogy_style);
      if (sf.send_suitability) sendTypes.add(sf.send_suitability);
      if (Array.isArray(sf.target_school_type)) {
        for (const t of sf.target_school_type) schoolTypes.add(t);
      }
    }
    return {
      pedagogies: [...pedagogies].sort(),
      sendTypes: [...sendTypes].sort(),
      schoolTypes: [...schoolTypes].sort(),
    };
  }, [profiles]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const sf = p.structured_fields;
      if (debouncedQuery) {
        const q = debouncedQuery.toLowerCase();
        if (
          !p.entity_name.toLowerCase().includes(q) &&
          !p.entity_id.toLowerCase().includes(q) &&
          !(sf.value_proposition || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (pedagogyFilter && sf.pedagogy_style !== pedagogyFilter) return false;
      if (sendFilter && sf.send_suitability !== sendFilter) return false;
      if (schoolTypeFilter) {
        if (!Array.isArray(sf.target_school_type) || !sf.target_school_type.includes(schoolTypeFilter)) return false;
      }
      return true;
    });
  }, [profiles, debouncedQuery, pedagogyFilter, sendFilter, schoolTypeFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "name-az":
        arr.sort((a, b) => a.entity_name.localeCompare(b.entity_name));
        break;
      case "name-za":
        arr.sort((a, b) => b.entity_name.localeCompare(a.entity_name));
        break;
      case "pedagogy":
        arr.sort((a, b) => (a.structured_fields.pedagogy_style || "").localeCompare(b.structured_fields.pedagogy_style || ""));
        break;
      case "send":
        arr.sort((a, b) => {
          const order = { "SEND focused": 0, "some SEND features": 1, "not designed": 2 };
          return (order[a.structured_fields.send_suitability] ?? 3) - (order[b.structured_fields.send_suitability] ?? 3);
        });
        break;
      case "school-types":
        arr.sort((a, b) => {
          const aLen = Array.isArray(a.structured_fields.target_school_type) ? a.structured_fields.target_school_type.length : 0;
          const bLen = Array.isArray(b.structured_fields.target_school_type) ? b.structured_fields.target_school_type.length : 0;
          return bLen - aLen;
        });
        break;
      case "recent":
        arr.sort((a, b) => new Date(b.profiled_at).getTime() - new Date(a.profiled_at).getTime());
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  const hasFilters = pedagogyFilter || sendFilter || schoolTypeFilter;

  // Pedagogy stats
  const pedagogyStats = useMemo(() => {
    const counts: Record<string, number> = {};
    profiles.forEach((p) => {
      const key = getPedagogyKey(p.structured_fields.pedagogy_style);
      const label = key.charAt(0).toUpperCase() + key.slice(1);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  }, [profiles]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-1">Marketplace</p>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Products</h1>
            <p className="text-slate-500 text-sm mt-1.5 max-w-md">
              Browse EdTech tools by pedagogy, SEND suitability, and school type. Click any product for detailed analysis.
            </p>
          </div>
          {/* Pedagogy distribution */}
          <div className="hidden lg:flex items-center gap-5">
            {pedagogyStats.map(([label, count]) => {
              const theme = getTheme(label);
              return (
                <div key={label} className="text-center">
                  <div className={`text-lg font-bold ${theme.dot.replace("bg-", "text-")}`}>{count}</div>
                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[80px]">{label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="relative mb-3">
          <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by product name or description..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <FilterSelect label="Pedagogy" value={pedagogyFilter} onChange={setPedagogyFilter} options={filterOptions.pedagogies} />
          <FilterSelect label="SEND" value={sendFilter} onChange={setSendFilter} options={filterOptions.sendTypes} />
          <FilterSelect label="School Types" value={schoolTypeFilter} onChange={setSchoolTypeFilter} options={filterOptions.schoolTypes} />
          {hasFilters ? (
            <button
              onClick={() => {
                setPedagogyFilter("");
                setSendFilter("");
                setSchoolTypeFilter("");
              }}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <span className="tabular-nums font-medium">{sorted.length} results</span>
            <span className="text-slate-300">|</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-2 py-1 bg-slate-50 border-0 rounded-lg text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-200 cursor-pointer"
            >
              <option value="name-az">A &rarr; Z</option>
              <option value="name-za">Z &rarr; A</option>
              <option value="pedagogy">Pedagogy</option>
              <option value="send">SEND focus</option>
              <option value="school-types">School fit count</option>
              <option value="recent">Recently profiled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
              <div className="h-1 bg-slate-200" />
              <div className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-slate-200" />
                  <div className="flex-1">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
                <div className="h-3 bg-slate-100 rounded w-full mb-2" />
                <div className="h-3 bg-slate-100 rounded w-2/3 mb-4" />
                <div className="flex gap-1.5">
                  <div className="h-5 bg-slate-100 rounded-md w-16" />
                  <div className="h-5 bg-slate-100 rounded-md w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <p className="text-slate-500 text-sm">No products found</p>
          {query ? <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p) => (
            <ProductCard key={p.entity_id} profile={p} onClick={() => setSelectedEntity({ type: "product", id: p.entity_id })} />
          ))}
        </div>
      )}

      {selectedEntity ? (
        <EntityDetailModal
          entityType={selectedEntity.type}
          entityId={selectedEntity.id}
          onClose={() => setSelectedEntity(null)}
          onNavigate={handleNavigate}
        />
      ) : null}
    </div>
  );
}

const ProductCard = React.memo(function ProductCard({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  const sf = profile.structured_fields;
  const theme = getTheme(sf.pedagogy_style);
  const valueProp = sf.value_proposition
    ? sf.value_proposition.length > 120
      ? sf.value_proposition.slice(0, 118) + "..."
      : sf.value_proposition
    : null;
  const schoolTypes = Array.isArray(sf.target_school_type) ? sf.target_school_type : [];
  const sendCfg = SEND_CONFIG[sf.send_suitability] || null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="bg-white border border-gray-200/80 rounded-2xl group hover:border-gray-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden cursor-pointer"
    >
      {/* Top accent bar */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}88, transparent)` }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3.5 mb-3">
          <div className="relative shrink-0">
            <div
              className={`w-11 h-11 rounded-xl ${theme.bg} flex items-center justify-center text-white font-bold text-lg shadow-lg`}
              style={{ boxShadow: `0 4px 14px ${theme.accent}33` }}
            >
              {profile.entity_name.charAt(0)}
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${theme.dot}`} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-800 truncate group-hover:text-brand-600 transition-colors leading-tight">
              {profile.entity_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-400 truncate">{profile.entity_id}</span>
            </div>
          </div>

          {/* SEND badge */}
          {sendCfg ? (
            <div className={`shrink-0 px-2 py-1 rounded-lg border text-[10px] font-bold ${sendCfg.color}`}>
              {sendCfg.icon}
            </div>
          ) : null}
        </div>

        {/* Value proposition */}
        {valueProp ? (
          <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">{valueProp}</p>
        ) : null}

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {sf.pedagogy_style ? (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${theme.light}`}>
              {getPedagogyLabel(sf.pedagogy_style)}
            </span>
          ) : null}
          {schoolTypes.length > 0 ? (
            <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[10px] font-medium">
              {schoolTypes.length} school type{schoolTypes.length !== 1 ? "s" : ""}
            </span>
          ) : null}
        </div>

        {/* Bottom metrics */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          {/* School types mini vis */}
          <div className="flex-1">
            <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mb-1">School fit</div>
            <div className="flex items-center gap-[3px]">
              {schoolTypes.slice(0, 5).map((t, i) => (
                <div
                  key={t}
                  className={`h-3.5 rounded-full ${theme.bg}`}
                  style={{ width: "6px", opacity: 0.4 + i * 0.12 }}
                  title={t}
                />
              ))}
              {schoolTypes.length > 0 ? (
                <span className="text-[10px] text-slate-500 font-medium ml-1">{schoolTypes.length}</span>
              ) : (
                <span className="text-[10px] text-slate-300">--</span>
              )}
            </div>
          </div>

          {/* SEND suitability */}
          <div className="shrink-0 text-right">
            <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mb-1">SEND</div>
            <span className="text-[10px] text-slate-500 font-medium">
              {sf.send_suitability === "SEND focused" ? "Focused" : sf.send_suitability === "some SEND features" ? "Some" : "N/A"}
            </span>
          </div>

          {/* Arrow */}
          <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-brand-50 transition-colors">
            <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-brand-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
});

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`px-3 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-brand-100 focus:border-brand-300 transition-all cursor-pointer ${
        value ? "bg-brand-50 border-brand-200 text-brand-700 font-medium" : "bg-white border-gray-200 text-slate-500 hover:border-gray-300"
      }`}
    >
      <option value="">All {label}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

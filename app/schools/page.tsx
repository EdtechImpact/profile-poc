// @ts-nocheck
"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { EntityDetailModal } from "@/app/components/shared/EntityDetailModal";

interface Profile {
  id: number;
  entity_id: string;
  entity_name: string;
  structured_fields: Record<string, any>;
  profiled_at: string;
}

type SortKey = "name-az" | "name-za" | "phase" | "region" | "ofsted" | "size" | "deprivation";

const PHASE_THEME = {
  Primary: { accent: "#3b82f6", bg: "bg-blue-500", light: "bg-blue-50 text-blue-700", ring: "ring-blue-200", dot: "bg-blue-400" },
  Secondary: { accent: "#8b5cf6", bg: "bg-violet-500", light: "bg-violet-50 text-violet-700", ring: "ring-violet-200", dot: "bg-violet-400" },
  "Not applicable": { accent: "#64748b", bg: "bg-slate-500", light: "bg-slate-100 text-slate-600", ring: "ring-slate-200", dot: "bg-slate-400" },
};

function getTheme(phase: string) {
  if (!phase) return PHASE_THEME["Not applicable"];
  for (const [key, val] of Object.entries(PHASE_THEME)) {
    if (phase.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return PHASE_THEME["Not applicable"];
}

const OFSTED_CONFIG = {
  Outstanding: { color: "text-emerald-600", bg: "bg-emerald-50", icon: "★★★★" },
  Good: { color: "text-blue-600", bg: "bg-blue-50", icon: "★★★" },
  "Requires Improvement": { color: "text-amber-600", bg: "bg-amber-50", icon: "★★" },
  Inadequate: { color: "text-red-600", bg: "bg-red-50", icon: "★" },
};

const DEPRIVATION_BAR = { low: "w-1/4", medium: "w-1/2", high: "w-3/4", "very high": "w-full" };

export default function SchoolsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ phase: "", type: "", region: "", ofsted_rating: "", size_band: "" });
  const [sortKey, setSortKey] = useState<SortKey>("name-az");
  const [selectedEntity, setSelectedEntity] = useState<{ type: "school" | "product"; id: string } | null>(null);

  const handleNavigate = useCallback((type: "school" | "product", id: string) => {
    setSelectedEntity({ type, id });
  }, []);

  useEffect(() => {
    fetch("/api/profiles/search?type=school&q=&limit=500")
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles || []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  const filterOptions = useMemo(() => {
    const phases = new Set<string>(), types = new Set<string>(), regions = new Set<string>(), ofsteds = new Set<string>(), sizes = new Set<string>();
    for (const p of profiles) {
      const sf = p.structured_fields;
      if (sf.phase) phases.add(sf.phase);
      if (sf.type) types.add(sf.type);
      if (sf.region) regions.add(sf.region);
      if (sf.ofsted_rating) ofsteds.add(sf.ofsted_rating);
      if (sf.size_band) sizes.add(sf.size_band);
    }
    return { phases: [...phases].sort(), types: [...types].sort(), regions: [...regions].sort(), ofsteds: [...ofsteds].sort(), sizes: [...sizes].sort() };
  }, [profiles]);

  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const sf = p.structured_fields;
      if (search) {
        const q = search.toLowerCase();
        if (!p.entity_name.toLowerCase().includes(q) && !p.entity_id.toLowerCase().includes(q)) return false;
      }
      if (filters.phase && sf.phase !== filters.phase) return false;
      if (filters.type && sf.type !== filters.type) return false;
      if (filters.region && sf.region !== filters.region) return false;
      if (filters.ofsted_rating && sf.ofsted_rating !== filters.ofsted_rating) return false;
      if (filters.size_band && sf.size_band !== filters.size_band) return false;
      return true;
    });
  }, [profiles, search, filters]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "name-az": arr.sort((a, b) => a.entity_name.localeCompare(b.entity_name)); break;
      case "name-za": arr.sort((a, b) => b.entity_name.localeCompare(a.entity_name)); break;
      case "phase": arr.sort((a, b) => (a.structured_fields.phase || "").localeCompare(b.structured_fields.phase || "")); break;
      case "region": arr.sort((a, b) => (a.structured_fields.region || "").localeCompare(b.structured_fields.region || "")); break;
      case "ofsted": {
        const order: Record<string, number> = { Outstanding: 0, Good: 1, "Requires Improvement": 2, Inadequate: 3 };
        arr.sort((a, b) => (order[a.structured_fields.ofsted_rating] ?? 4) - (order[b.structured_fields.ofsted_rating] ?? 4));
        break;
      }
      case "size": {
        const sizeOrder: Record<string, number> = { small: 0, medium: 1, large: 2, "very large": 3 };
        arr.sort((a, b) => (sizeOrder[(a.structured_fields.size_band || "").toLowerCase()] ?? 4) - (sizeOrder[(b.structured_fields.size_band || "").toLowerCase()] ?? 4));
        break;
      }
      case "deprivation": {
        const depOrder: Record<string, number> = { "very high": 0, high: 1, medium: 2, low: 3 };
        arr.sort((a, b) => (depOrder[(a.structured_fields.deprivation_level || "").toLowerCase()] ?? 4) - (depOrder[(b.structured_fields.deprivation_level || "").toLowerCase()] ?? 4));
        break;
      }
    }
    return arr;
  }, [filtered, sortKey]);

  const hasFilters = filters.phase || filters.type || filters.region || filters.ofsted_rating || filters.size_band;

  // Stats
  const stats = useMemo(() => {
    const phaseCount: Record<string, number> = {};
    profiles.forEach(p => { const ph = p.structured_fields.phase || "Other"; phaseCount[ph] = (phaseCount[ph] || 0) + 1; });
    return { total: profiles.length, phases: phaseCount };
  }, [profiles]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold text-brand-500 uppercase tracking-widest mb-1">Directory</p>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Schools</h1>
            <p className="text-slate-500 text-sm mt-1.5 max-w-md">
              Explore and discover similar schools. Click any card to see detailed similarity analysis, recommended products, and graph relationships.
            </p>
          </div>
          {/* Quick phase stats */}
          <div className="hidden lg:flex items-center gap-4">
            {Object.entries(stats.phases).map(([phase, count]) => {
              const theme = getTheme(phase);
              return (
                <div key={phase} className="text-center">
                  <div className={`text-lg font-bold ${theme.dot.replace("bg-", "text-")}`}>{count}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{phase}</div>
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
            placeholder="Search by school name or URN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-300 focus:ring-2 focus:ring-brand-100 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <FilterSelect label="Phase" value={filters.phase} onChange={(v) => setFilters((f) => ({ ...f, phase: v }))} options={filterOptions.phases} />
          <FilterSelect label="Type" value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} options={filterOptions.types} />
          <FilterSelect label="Region" value={filters.region} onChange={(v) => setFilters((f) => ({ ...f, region: v }))} options={filterOptions.regions} />
          <FilterSelect label="Ofsted" value={filters.ofsted_rating} onChange={(v) => setFilters((f) => ({ ...f, ofsted_rating: v }))} options={filterOptions.ofsteds} />
          <FilterSelect label="Size" value={filters.size_band} onChange={(v) => setFilters((f) => ({ ...f, size_band: v }))} options={filterOptions.sizes} />
          {hasFilters ? (
            <button onClick={() => setFilters({ phase: "", type: "", region: "", ofsted_rating: "", size_band: "" })} className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              Clear
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-2 text-xs text-slate-400">
            <span className="tabular-nums font-medium">{sorted.length} results</span>
            <span className="text-slate-300">|</span>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="px-2 py-1 bg-slate-50 border-0 rounded-lg text-xs text-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-200 cursor-pointer">
              <option value="name-az">A → Z</option>
              <option value="name-za">Z → A</option>
              <option value="phase">Phase</option>
              <option value="region">Region</option>
              <option value="ofsted">Ofsted rating</option>
              <option value="size">Size</option>
              <option value="deprivation">Deprivation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-200" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-slate-100 rounded w-full mb-2" />
              <div className="h-3 bg-slate-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
          </div>
          <p className="text-slate-500 text-sm">No schools found</p>
          {search ? <p className="text-slate-400 text-xs mt-1">Try adjusting your search or filters</p> : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((p) => <SchoolCard key={p.entity_id} profile={p} onClick={() => setSelectedEntity({ type: "school", id: p.entity_id })} />)}
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

function SchoolCard({ profile, onClick }: { profile: Profile; onClick: () => void }) {
  const sf = profile.structured_fields;
  const theme = getTheme(sf.phase);
  const ofsted = OFSTED_CONFIG[sf.ofsted_rating as keyof typeof OFSTED_CONFIG];
  const depWidth = DEPRIVATION_BAR[sf.deprivation_level as keyof typeof DEPRIVATION_BAR] || "w-1/3";
  const techNeeds = Array.isArray(sf.likely_tech_needs) ? sf.likely_tech_needs : [];
  const charSnippet = sf.school_character ? sf.school_character.split(".")[0] + "." : null;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      className="bg-white border border-gray-200/80 rounded-2xl group hover:border-gray-300 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden cursor-pointer"
    >
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}88, transparent)` }} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-3.5 mb-3">
          {/* Phase indicator orb */}
          <div className="relative shrink-0">
            <div className={`w-11 h-11 rounded-xl ${theme.bg} flex items-center justify-center text-white font-bold text-lg shadow-lg`} style={{ boxShadow: `0 4px 14px ${theme.accent}33` }}>
              {profile.entity_name.charAt(0)}
            </div>
            {/* Phase dot */}
            <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${theme.dot}`} />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-semibold text-slate-800 truncate group-hover:text-brand-600 transition-colors leading-tight">
              {profile.entity_name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-slate-400 tabular-nums">URN {profile.entity_id}</span>
              {sf.region ? (
                <>
                  <span className="text-slate-200">·</span>
                  <span className="text-[11px] text-slate-400 truncate">{sf.region}</span>
                </>
              ) : null}
            </div>
          </div>

          {/* Ofsted badge */}
          {ofsted ? (
            <div className={`shrink-0 px-2 py-1 rounded-lg ${ofsted.bg} ${ofsted.color} text-[10px] font-bold`}>
              {ofsted.icon}
            </div>
          ) : null}
        </div>

        {/* Character snippet */}
        {charSnippet ? (
          <p className="text-xs text-slate-400 leading-relaxed mb-3 line-clamp-2">{charSnippet}</p>
        ) : null}

        {/* Tags row */}
        <div className="flex flex-wrap gap-1.5 mb-3.5">
          {sf.phase ? (
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${theme.light}`}>{sf.phase}</span>
          ) : null}
          {sf.type ? (
            <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[10px] font-medium">{sf.type}</span>
          ) : null}
          {sf.size_band ? (
            <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[10px] font-medium">{sf.size_band}</span>
          ) : null}
        </div>

        {/* Bottom metrics */}
        <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
          {/* Deprivation indicator */}
          <div className="flex-1">
            <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mb-1">Deprivation</div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${theme.bg} ${depWidth} transition-all`} style={{ opacity: 0.7 }} />
            </div>
          </div>

          {/* Tech needs count */}
          {techNeeds.length > 0 ? (
            <div className="shrink-0 text-right">
              <div className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Tech needs</div>
              <div className="flex items-center gap-0.5">
                {techNeeds.slice(0, 4).map((_, i) => (
                  <div key={i} className={`w-1.5 h-4 rounded-full ${theme.bg}`} style={{ opacity: 0.3 + i * 0.2 }} />
                ))}
                <span className="text-[10px] text-slate-500 font-semibold ml-1">{techNeeds.length}</span>
              </div>
            </div>
          ) : null}

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
}

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

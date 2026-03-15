// @ts-nocheck
"use client";

import Link from "next/link";
import { useState, useEffect, useMemo } from "react";

interface Profile {
  id: number;
  entity_id: string;
  entity_name: string;
  structured_fields: Record<string, any>;
  profiled_at: string;
}

type SortKey = "name-az" | "name-za" | "phase" | "region";

export default function SchoolsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({
    phase: "",
    type: "",
    region: "",
    ofsted_rating: "",
    size_band: "",
  });
  const [sortKey, setSortKey] = useState<SortKey>("name-az");

  useEffect(() => {
    fetch("/api/profiles/search?type=school&q=&limit=500")
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles || []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  // Extract unique filter values from loaded data
  const filterOptions = useMemo(() => {
    const phases = new Set<string>();
    const types = new Set<string>();
    const regions = new Set<string>();
    const ofsteds = new Set<string>();
    const sizes = new Set<string>();
    for (const p of profiles) {
      const sf = p.structured_fields;
      if (sf.phase) phases.add(sf.phase);
      if (sf.type) types.add(sf.type);
      if (sf.region) regions.add(sf.region);
      if (sf.ofsted_rating) ofsteds.add(sf.ofsted_rating);
      if (sf.size_band) sizes.add(sf.size_band);
    }
    return {
      phases: [...phases].sort(),
      types: [...types].sort(),
      regions: [...regions].sort(),
      ofsteds: [...ofsteds].sort(),
      sizes: [...sizes].sort(),
    };
  }, [profiles]);

  // Filter
  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const sf = p.structured_fields;
      if (search) {
        const q = search.toLowerCase();
        if (
          !p.entity_name.toLowerCase().includes(q) &&
          !p.entity_id.toLowerCase().includes(q)
        )
          return false;
      }
      if (filters.phase && sf.phase !== filters.phase) return false;
      if (filters.type && sf.type !== filters.type) return false;
      if (filters.region && sf.region !== filters.region) return false;
      if (filters.ofsted_rating && sf.ofsted_rating !== filters.ofsted_rating) return false;
      if (filters.size_band && sf.size_band !== filters.size_band) return false;
      return true;
    });
  }, [profiles, search, filters]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "name-az":
        arr.sort((a, b) => a.entity_name.localeCompare(b.entity_name));
        break;
      case "name-za":
        arr.sort((a, b) => b.entity_name.localeCompare(a.entity_name));
        break;
      case "phase":
        arr.sort((a, b) => (a.structured_fields.phase || "").localeCompare(b.structured_fields.phase || ""));
        break;
      case "region":
        arr.sort((a, b) => (a.structured_fields.region || "").localeCompare(b.structured_fields.region || ""));
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  const hasFilters = filters.phase || filters.type || filters.region || filters.ofsted_rating || filters.size_band;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-down">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Schools</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className="text-brand-600 font-bold tabular-nums">{sorted.length}</span> school profiles
              {profiles.length !== sorted.length ? (
                <span className="text-slate-400"> of {profiles.length}</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4 mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search schools by name or URN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <FilterSelect
            label="Phase"
            value={filters.phase}
            onChange={(v) => setFilters((f) => ({ ...f, phase: v }))}
            options={filterOptions.phases}
          />
          <FilterSelect
            label="Type"
            value={filters.type}
            onChange={(v) => setFilters((f) => ({ ...f, type: v }))}
            options={filterOptions.types}
          />
          <FilterSelect
            label="Region"
            value={filters.region}
            onChange={(v) => setFilters((f) => ({ ...f, region: v }))}
            options={filterOptions.regions}
          />
          <FilterSelect
            label="Ofsted"
            value={filters.ofsted_rating}
            onChange={(v) => setFilters((f) => ({ ...f, ofsted_rating: v }))}
            options={filterOptions.ofsteds}
          />
          <FilterSelect
            label="Size Band"
            value={filters.size_band}
            onChange={(v) => setFilters((f) => ({ ...f, size_band: v }))}
            options={filterOptions.sizes}
          />
          {hasFilters ? (
            <button
              onClick={() => setFilters({ phase: "", type: "", region: "", ofsted_rating: "", size_band: "" })}
              className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {/* Sort */}
      <div className="flex items-center justify-end mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort:</span>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all cursor-pointer hover:border-slate-300"
          >
            <option value="name-az">Name A-Z</option>
            <option value="name-za">Name Z-A</option>
            <option value="phase">Phase</option>
            <option value="region">Region</option>
          </select>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading schools...</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-slate-400 animate-fade-in">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          No school profiles found. {search ? "Try a different search term." : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((p, index) => {
            const sf = p.structured_fields;
            return (
              <Link
                key={p.entity_id}
                href={`/schools/${p.entity_id}`}
                className="glass-card card-glow p-5 group relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${0.15 + index * 0.03}s`, animationFillMode: "both" }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-blue-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-brand-400 to-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                <div className="relative">
                  {/* School name */}
                  <div className="font-bold text-sm text-slate-800 mb-1.5 group-hover:text-brand-700 transition-colors duration-300 truncate">
                    {p.entity_name}
                  </div>

                  {/* URN badge */}
                  <span className="inline-block px-2 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[10px] font-semibold border border-brand-100 mb-2">
                    URN: {p.entity_id}
                  </span>

                  {/* Phase + Type badges */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {sf.phase ? (
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-medium border border-indigo-100">
                        {sf.phase}
                      </span>
                    ) : null}
                    {sf.type ? (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-lg text-[10px] font-medium border border-slate-200/50">
                        {sf.type}
                      </span>
                    ) : null}
                  </div>

                  {/* Region */}
                  {sf.region ? (
                    <div className="text-[11px] text-slate-400 mb-2">{sf.region}</div>
                  ) : null}

                  {/* Ofsted + Size + FSM row */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {sf.ofsted_rating ? <OfstedBadge rating={sf.ofsted_rating} /> : null}
                    {sf.size_band ? (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-medium border border-slate-200/50">
                        {sf.size_band}
                      </span>
                    ) : null}
                    {sf.fsm_band ? (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-medium border border-slate-200/50">
                        FSM: {sf.fsm_band}
                      </span>
                    ) : null}
                  </div>

                  {/* Trust name */}
                  {sf.trust_name ? (
                    <div className="text-[10px] text-slate-400 truncate">{sf.trust_name}</div>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all cursor-pointer hover:border-slate-300"
    >
      <option value="">All {label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}

function OfstedBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    Outstanding: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Good: "bg-blue-50 text-blue-700 border-blue-200",
    "Requires Improvement": "bg-amber-50 text-amber-700 border-amber-200",
    Inadequate: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border ${
        colors[rating] || "bg-slate-50 text-slate-600 border-slate-200"
      }`}
    >
      {rating}
    </span>
  );
}

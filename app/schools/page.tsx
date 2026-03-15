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

function getPhaseGradient(phase: string): string {
  const p = (phase || "").toLowerCase();
  if (p.includes("primary")) return "from-blue-500 to-blue-600";
  if (p.includes("secondary")) return "from-purple-500 to-purple-600";
  if (p.includes("all-through") || p.includes("all through")) return "from-indigo-500 to-indigo-600";
  return "from-slate-400 to-slate-500";
}

function getPhaseColor(phase: string): string {
  const p = (phase || "").toLowerCase();
  if (p.includes("primary")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (p.includes("secondary")) return "bg-purple-50 text-purple-700 border-purple-100";
  if (p.includes("all-through") || p.includes("all through")) return "bg-indigo-50 text-indigo-700 border-indigo-100";
  return "bg-slate-50 text-slate-600 border-slate-200";
}

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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Schools</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className="text-blue-600 font-bold tabular-nums">{sorted.length}</span> school profiles
              {profiles.length !== sorted.length ? (
                <span className="text-slate-400"> of {profiles.length}</span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4 mb-6">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search schools by name or URN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <FilterSelect label="Phase" value={filters.phase} onChange={(v) => setFilters((f) => ({ ...f, phase: v }))} options={filterOptions.phases} />
          <FilterSelect label="Type" value={filters.type} onChange={(v) => setFilters((f) => ({ ...f, type: v }))} options={filterOptions.types} />
          <FilterSelect label="Region" value={filters.region} onChange={(v) => setFilters((f) => ({ ...f, region: v }))} options={filterOptions.regions} />
          <FilterSelect label="Ofsted" value={filters.ofsted_rating} onChange={(v) => setFilters((f) => ({ ...f, ofsted_rating: v }))} options={filterOptions.ofsteds} />
          <FilterSelect label="Size" value={filters.size_band} onChange={(v) => setFilters((f) => ({ ...f, size_band: v }))} options={filterOptions.sizes} />
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:border-gray-300"
            >
              <option value="name-az">Name A-Z</option>
              <option value="name-za">Name Z-A</option>
              <option value="phase">Phase</option>
              <option value="region">Region</option>
            </select>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading schools...</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          No schools found.{search ? " Try a different search." : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((p) => {
            const sf = p.structured_fields;
            const initial = p.entity_name.charAt(0).toUpperCase();
            const gradient = getPhaseGradient(sf.phase);
            return (
              <Link
                key={p.entity_id}
                href={`/schools/${p.entity_id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg hover:shadow-blue-500/5 hover:border-gray-300 transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Gradient header with monogram */}
                <div className={`h-24 bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
                  <span className="text-4xl font-bold text-white/30 select-none">{initial}</span>
                  {sf.ofsted_rating ? (
                    <div className="absolute top-2.5 right-2.5">
                      <OfstedBadge rating={sf.ofsted_rating} />
                    </div>
                  ) : null}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                    {p.entity_name}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 tabular-nums">URN {p.entity_id}</p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {sf.phase ? (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${getPhaseColor(sf.phase)}`}>
                        {sf.phase}
                      </span>
                    ) : null}
                    {sf.type ? (
                      <span className="px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md text-[10px] font-medium border border-slate-200">
                        {sf.type}
                      </span>
                    ) : null}
                  </div>

                  {sf.region ? (
                    <div className="flex items-center gap-1 mt-2.5 text-[11px] text-slate-400">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0 1 15 0Z" />
                      </svg>
                      {sf.region}
                    </div>
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
      className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer hover:border-gray-300"
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
    Outstanding: "bg-emerald-500 text-white",
    Good: "bg-blue-500 text-white",
    "Requires Improvement": "bg-amber-500 text-white",
    Inadequate: "bg-red-500 text-white",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm ${colors[rating] || "bg-slate-500 text-white"}`}>
      {rating}
    </span>
  );
}

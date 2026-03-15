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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Schools</h1>
          <p className="text-zinc-500 text-sm mt-1">
            <span className="text-brand-400 font-medium tabular-nums">{sorted.length}</span> school profiles
            {profiles.length !== sorted.length ? (
              <span className="text-zinc-600"> of {profiles.length}</span>
            ) : null}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="mb-6">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-brand-500/40 focus:border-brand-500/40 transition-all"
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
              className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1 px-2 py-1 rounded-md hover:bg-red-500/10"
            >
              Clear filters
            </button>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] text-zinc-600">Sort</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-all cursor-pointer hover:border-zinc-700"
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
        <div className="flex items-center justify-center py-20 text-zinc-600 gap-2">
          <div className="w-4 h-4 border-2 border-brand-500/40 border-t-brand-400 rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-zinc-600">
          No schools found.{search ? " Try a different search." : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sorted.map((p) => {
            const sf = p.structured_fields;
            return (
              <Link
                key={p.entity_id}
                href={`/schools/${p.entity_id}`}
                className="glass-card card-glow px-4 py-3.5 group relative"
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-brand-500/0 via-brand-500/20 to-brand-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-zinc-200 truncate group-hover:text-brand-300 transition-colors">
                      {p.entity_name}
                    </div>
                    <div className="text-[11px] text-zinc-600 mt-0.5 tabular-nums">URN {p.entity_id}</div>
                  </div>
                  <svg className="w-4 h-4 text-zinc-700 group-hover:text-zinc-500 transition-colors shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {sf.phase ? (
                    <span className="px-1.5 py-0.5 bg-brand-500/10 text-brand-300 rounded text-[10px] font-medium">
                      {sf.phase}
                    </span>
                  ) : null}
                  {sf.type ? (
                    <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px] font-medium">
                      {sf.type}
                    </span>
                  ) : null}
                  {sf.ofsted_rating ? <OfstedBadge rating={sf.ofsted_rating} /> : null}
                  {sf.region ? (
                    <span className="px-1.5 py-0.5 bg-zinc-800/50 text-zinc-500 rounded text-[10px]">
                      {sf.region}
                    </span>
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
      className="px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-[11px] text-zinc-400 focus:outline-none focus:ring-1 focus:ring-brand-500/30 transition-all cursor-pointer hover:border-zinc-700"
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
    Outstanding: "bg-emerald-500/10 text-emerald-400",
    Good: "bg-blue-500/10 text-blue-400",
    "Requires Improvement": "bg-amber-500/10 text-amber-400",
    Inadequate: "bg-red-500/10 text-red-400",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${colors[rating] || "bg-zinc-800 text-zinc-500"}`}>
      {rating}
    </span>
  );
}

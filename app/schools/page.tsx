"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

interface Profile {
  id: number;
  entity_id: string;
  entity_name: string;
  structured_fields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  profiled_at: string;
}

export default function SchoolsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ phase: "", ofsted_rating: "", size_band: "" });

  const fetchSchools = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "school" });
      if (query) params.set("q", query);
      const res = await fetch(`/api/profiles/search?${params}`);
      const data = await res.json();
      setProfiles(data.profiles || []);
    } catch {
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    const timer = setTimeout(fetchSchools, 300);
    return () => clearTimeout(timer);
  }, [fetchSchools]);

  const filteredProfiles = profiles.filter((p) => {
    const sf = p.structured_fields as Record<string, string>;
    if (filters.phase && sf.phase !== filters.phase) return false;
    if (filters.ofsted_rating && sf.ofsted_rating !== filters.ofsted_rating) return false;
    if (filters.size_band && sf.size_band !== filters.size_band) return false;
    return true;
  });

  const hasFilters = filters.phase || filters.ofsted_rating || filters.size_band;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Schools</h1>
          <p className="text-slate-500 text-sm mt-1">{filteredProfiles.length} school profiles</p>
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
          />
        </div>
        <div className="flex gap-3 items-center">
          <FilterSelect label="Phase" value={filters.phase}
            onChange={(v) => setFilters((f) => ({ ...f, phase: v }))}
            options={["primary", "secondary", "all-through", "special", "nursery"]} />
          <FilterSelect label="Ofsted" value={filters.ofsted_rating}
            onChange={(v) => setFilters((f) => ({ ...f, ofsted_rating: v }))}
            options={["Outstanding", "Good", "Requires Improvement", "Inadequate"]} />
          <FilterSelect label="Size" value={filters.size_band}
            onChange={(v) => setFilters((f) => ({ ...f, size_band: v }))}
            options={["small", "medium", "large"]} />
          {hasFilters && (
            <button
              onClick={() => setFilters({ phase: "", ofsted_rating: "", size_band: "" })}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          No school profiles found. {query && "Try a different search term."}
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/60">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">URN</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Phase</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Region</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ofsted</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p) => {
                const sf = p.structured_fields as Record<string, string>;
                return (
                  <tr key={p.entity_id} className="border-b border-slate-100/60 hover:bg-brand-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/schools/${p.entity_id}`} className="text-slate-800 hover:text-brand-600 font-medium transition-colors">
                        {p.entity_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{p.entity_id}</td>
                    <td className="px-4 py-3"><Tag value={sf.phase} /></td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{sf.type || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{sf.region || "-"}</td>
                    <td className="px-4 py-3"><OfstedBadge rating={sf.ofsted_rating} /></td>
                    <td className="px-4 py-3"><Tag value={sf.size_band} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
    >
      <option value="">All {label}</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Tag({ value }: { value?: string }) {
  if (!value) return <span className="text-slate-300 text-xs">-</span>;
  return (
    <span className="inline-block px-2 py-0.5 bg-slate-100/80 text-slate-600 rounded-md text-[11px] font-medium">
      {value}
    </span>
  );
}

function OfstedBadge({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-slate-300 text-xs">-</span>;
  const colors: Record<string, string> = {
    Outstanding: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Good: "bg-blue-50 text-blue-700 border-blue-200",
    "Requires Improvement": "bg-amber-50 text-amber-700 border-amber-200",
    Inadequate: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors[rating] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {rating}
    </span>
  );
}

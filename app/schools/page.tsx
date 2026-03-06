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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-down">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-glow-brand">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Schools</h1>
              <p className="text-slate-500 text-sm mt-0.5">
                <span className="text-brand-600 font-bold tabular-nums">{filteredProfiles.length}</span> school profiles indexed
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="glass-card p-4 mb-6 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search schools by name or URN..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
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
              className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
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
          <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading schools...</span>
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-20 text-slate-400 animate-fade-in">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          No school profiles found. {query && "Try a different search term."}
        </div>
      ) : (
        <div className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.15s", animationFillMode: "both" }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50/90 to-slate-50/50 border-b border-slate-200/60">
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">URN</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Phase</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Region</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Ofsted</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">Size</th>
              </tr>
            </thead>
            <tbody>
              {filteredProfiles.map((p, index) => {
                const sf = p.structured_fields as Record<string, string>;
                return (
                  <tr
                    key={p.entity_id}
                    className="border-b border-slate-100/60 hover:bg-brand-50/40 transition-all duration-200 group animate-fade-in-up"
                    style={{ animationDelay: `${0.2 + index * 0.03}s`, animationFillMode: "both" }}
                  >
                    <td className="px-4 py-3.5">
                      <Link href={`/schools/${p.entity_id}`} className="text-slate-800 hover:text-brand-600 font-semibold transition-colors group-hover:translate-x-0.5 inline-block transform duration-200">
                        {p.entity_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 font-mono text-xs">{p.entity_id}</td>
                    <td className="px-4 py-3.5"><Tag value={sf.phase} /></td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{sf.type || "-"}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-xs">{sf.region || "-"}</td>
                    <td className="px-4 py-3.5"><OfstedBadge rating={sf.ofsted_rating} /></td>
                    <td className="px-4 py-3.5"><Tag value={sf.size_band} /></td>
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
      className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all cursor-pointer hover:border-slate-300"
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
    <span className="inline-block px-2.5 py-0.5 bg-slate-100/80 text-slate-600 rounded-lg text-[11px] font-medium border border-slate-200/50">
      {value}
    </span>
  );
}

function OfstedBadge({ rating }: { rating?: string }) {
  if (!rating) return <span className="text-slate-300 text-xs">-</span>;
  const colors: Record<string, string> = {
    Outstanding: "bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm shadow-emerald-100",
    Good: "bg-blue-50 text-blue-700 border-blue-200 shadow-sm shadow-blue-100",
    "Requires Improvement": "bg-amber-50 text-amber-700 border-amber-200 shadow-sm shadow-amber-100",
    Inadequate: "bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100",
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border transition-all duration-200 hover:scale-105 ${colors[rating] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {rating}
    </span>
  );
}

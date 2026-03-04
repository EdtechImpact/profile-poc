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

export default function ProductsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "product" });
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
    const timer = setTimeout(fetchProducts, 300);
    return () => clearTimeout(timer);
  }, [fetchProducts]);

  const categories = [
    ...new Set(
      profiles
        .map((p) => (p.structured_fields as Record<string, string>).primary_category)
        .filter(Boolean)
    ),
  ].sort();

  const filteredProfiles = profiles.filter((p) => {
    if (!categoryFilter) return true;
    return (p.structured_fields as Record<string, string>).primary_category === categoryFilter;
  });

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products</h1>
          <p className="text-slate-500 text-sm mt-1">{filteredProfiles.length} product profiles</p>
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
            placeholder="Search products by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          />
        </div>
        <div className="flex gap-3 items-center">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          {categoryFilter && (
            <button
              onClick={() => setCategoryFilter("")}
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

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Loading...
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="text-center py-20 text-slate-400">No product profiles found.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfiles.map((p) => {
            const sf = p.structured_fields as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
            return (
              <Link
                key={p.entity_id}
                href={`/products/${p.entity_id}`}
                className="glass-card p-5 group hover:scale-[1.01] transition-all relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="font-semibold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors">
                    {p.entity_name}
                  </div>
                  {sf.primary_category && (
                    <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] font-semibold border border-emerald-100 mb-2">
                      {sf.primary_category as string}
                    </span>
                  )}
                  {sf.subjects && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(sf.subjects as string[]).slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-slate-100/80 text-slate-500 rounded-md text-[10px] font-medium">
                          {s}
                        </span>
                      ))}
                      {(sf.subjects as string[]).length > 3 && (
                        <span className="text-[10px] text-slate-400">+{(sf.subjects as string[]).length - 3}</span>
                      )}
                    </div>
                  )}
                  <div className="flex gap-3 mt-3 text-[11px] text-slate-400">
                    {sf.age_range && <span className="flex items-center gap-1">{sf.age_range as string}</span>}
                    {sf.user_rating && (
                      <span className="flex items-center gap-1">
                        <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {sf.user_rating}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

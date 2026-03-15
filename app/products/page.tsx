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

type SortKey = "name-az" | "rating" | "reviews";

export default function ProductsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [ageRangeFilter, setAgeRangeFilter] = useState("");
  const [purchaseModelFilter, setPurchaseModelFilter] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name-az");

  useEffect(() => {
    fetch("/api/profiles/search?type=product&q=&limit=500")
      .then((r) => r.json())
      .then((data) => setProfiles(data.profiles || []))
      .catch(() => setProfiles([]))
      .finally(() => setLoading(false));
  }, []);

  // Dynamically compute filter options from loaded data
  const filterOptions = useMemo(() => {
    const categories = new Set<string>();
    const ageRanges = new Set<string>();
    const purchaseModels = new Set<string>();
    for (const p of profiles) {
      const sf = p.structured_fields;
      if (sf.primary_category) categories.add(sf.primary_category);
      if (sf.purchase_model) purchaseModels.add(sf.purchase_model);
      if (sf.age_range) {
        if (Array.isArray(sf.age_range)) {
          for (const a of sf.age_range) ageRanges.add(a);
        } else {
          ageRanges.add(String(sf.age_range));
        }
      }
    }
    return {
      categories: [...categories].sort(),
      ageRanges: [...ageRanges].sort(),
      purchaseModels: [...purchaseModels].sort(),
    };
  }, [profiles]);

  // Filter
  const filtered = useMemo(() => {
    return profiles.filter((p) => {
      const sf = p.structured_fields;
      if (query) {
        const q = query.toLowerCase();
        if (!p.entity_name.toLowerCase().includes(q) && !p.entity_id.toLowerCase().includes(q))
          return false;
      }
      if (categoryFilter && sf.primary_category !== categoryFilter) return false;
      if (purchaseModelFilter && sf.purchase_model !== purchaseModelFilter) return false;
      if (ageRangeFilter) {
        if (Array.isArray(sf.age_range)) {
          if (!sf.age_range.includes(ageRangeFilter)) return false;
        } else {
          if (String(sf.age_range || "") !== ageRangeFilter) return false;
        }
      }
      return true;
    });
  }, [profiles, query, categoryFilter, ageRangeFilter, purchaseModelFilter]);

  // Sort
  const sorted = useMemo(() => {
    const arr = [...filtered];
    switch (sortKey) {
      case "name-az":
        arr.sort((a, b) => a.entity_name.localeCompare(b.entity_name));
        break;
      case "rating":
        arr.sort((a, b) => {
          const ra = Number(b.structured_fields.user_rating) || 0;
          const rb = Number(a.structured_fields.user_rating) || 0;
          return ra - rb;
        });
        break;
      case "reviews":
        arr.sort((a, b) => {
          const ra = Number(b.structured_fields.review_count) || 0;
          const rb = Number(a.structured_fields.review_count) || 0;
          return ra - rb;
        });
        break;
    }
    return arr;
  }, [filtered, sortKey]);

  const hasFilters = categoryFilter || ageRangeFilter || purchaseModelFilter;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-down">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-glow-emerald">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Products</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              <span className="text-emerald-600 font-bold tabular-nums">{sorted.length}</span> product profiles
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
            placeholder="Search products by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer hover:border-slate-300"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={ageRangeFilter}
            onChange={(e) => setAgeRangeFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer hover:border-slate-300"
          >
            <option value="">All Age Ranges</option>
            {filterOptions.ageRanges.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={purchaseModelFilter}
            onChange={(e) => setPurchaseModelFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-sm text-slate-600 bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer hover:border-slate-300"
          >
            <option value="">All Purchase Models</option>
            {filterOptions.purchaseModels.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          {hasFilters ? (
            <button
              onClick={() => {
                setCategoryFilter("");
                setAgeRangeFilter("");
                setPurchaseModelFilter("");
              }}
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
            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-600 bg-white/80 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all cursor-pointer hover:border-slate-300"
          >
            <option value="name-az">Name A-Z</option>
            <option value="rating">Rating (highest)</option>
            <option value="reviews">Reviews (most)</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400 gap-2">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading products...</span>
        </div>
      ) : sorted.length === 0 ? (
        <div className="text-center py-20 text-slate-400 animate-fade-in">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          No product profiles found. {query ? "Try a different search term." : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p, index) => {
            const sf = p.structured_fields;
            const rating = sf.user_rating ? Number(sf.user_rating) : null;
            return (
              <Link
                key={p.entity_id}
                href={`/products/${p.entity_id}`}
                className="glass-card card-glow p-5 group relative overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${0.15 + index * 0.03}s`, animationFillMode: "both" }}
              >
                {/* Hover gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-teal-500/3 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {/* Top accent line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 to-teal-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                <div className="relative">
                  <div className="font-semibold text-slate-800 mb-2 group-hover:text-emerald-700 transition-colors duration-300">
                    {p.entity_name}
                  </div>
                  {sf.primary_category ? (
                    <span className="inline-block px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-lg text-[11px] font-semibold border border-emerald-100 mb-2">
                      {sf.primary_category}
                    </span>
                  ) : null}
                  {sf.subjects ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {(sf.subjects as string[]).slice(0, 3).map((s) => (
                        <span key={s} className="px-1.5 py-0.5 bg-slate-100/80 text-slate-500 rounded-lg text-[10px] font-medium border border-slate-200/50">
                          {s}
                        </span>
                      ))}
                      {(sf.subjects as string[]).length > 3 ? (
                        <span className="text-[10px] text-slate-400 font-medium">+{(sf.subjects as string[]).length - 3}</span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex gap-3 mt-3 text-[11px] text-slate-400">
                    {sf.age_range ? (
                      <span className="flex items-center gap-1">
                        {Array.isArray(sf.age_range) ? sf.age_range.join(", ") : sf.age_range}
                      </span>
                    ) : null}
                    {rating !== null ? (
                      <span className="flex items-center gap-1 text-amber-600 font-semibold">
                        <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {rating.toFixed(1)}/10
                      </span>
                    ) : null}
                    {sf.purchase_model ? (
                      <span className="flex items-center gap-1">{sf.purchase_model}</span>
                    ) : null}
                  </div>

                  {/* Explore arrow */}
                  <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-600 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-1 group-hover:translate-y-0">
                    View profile
                    <svg className="w-3 h-3 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                    </svg>
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

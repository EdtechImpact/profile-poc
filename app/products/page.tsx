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

function getCategoryGradient(category: string): string {
  const c = (category || "").toLowerCase();
  if (c.includes("math")) return "from-blue-500 to-blue-600";
  if (c.includes("reading") || c.includes("literacy") || c.includes("english")) return "from-emerald-500 to-emerald-600";
  if (c.includes("science") || c.includes("stem")) return "from-purple-500 to-purple-600";
  if (c.includes("assessment")) return "from-amber-500 to-amber-600";
  if (c.includes("safeguard") || c.includes("wellbeing") || c.includes("well-being")) return "from-rose-500 to-rose-600";
  if (c.includes("admin") || c.includes("management") || c.includes("mis")) return "from-slate-500 to-slate-600";
  if (c.includes("send") || c.includes("sen") || c.includes("special")) return "from-teal-500 to-teal-600";
  if (c.includes("coding") || c.includes("comput")) return "from-cyan-500 to-cyan-600";
  return "from-indigo-500 to-indigo-600";
}

function getCategoryColor(category: string): string {
  const c = (category || "").toLowerCase();
  if (c.includes("math")) return "bg-blue-50 text-blue-700 border-blue-100";
  if (c.includes("reading") || c.includes("literacy") || c.includes("english")) return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (c.includes("science") || c.includes("stem")) return "bg-purple-50 text-purple-700 border-purple-100";
  if (c.includes("assessment")) return "bg-amber-50 text-amber-700 border-amber-100";
  if (c.includes("safeguard") || c.includes("wellbeing") || c.includes("well-being")) return "bg-rose-50 text-rose-700 border-rose-100";
  if (c.includes("admin") || c.includes("management") || c.includes("mis")) return "bg-slate-50 text-slate-700 border-slate-200";
  if (c.includes("send") || c.includes("sen") || c.includes("special")) return "bg-teal-50 text-teal-700 border-teal-100";
  if (c.includes("coding") || c.includes("comput")) return "bg-cyan-50 text-cyan-700 border-cyan-100";
  return "bg-indigo-50 text-indigo-700 border-indigo-100";
}

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
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
      <div className="glass-card p-4 mb-4">
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search products by name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer hover:border-gray-300"
          >
            <option value="">All Categories</option>
            {filterOptions.categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={ageRangeFilter}
            onChange={(e) => setAgeRangeFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer hover:border-gray-300"
          >
            <option value="">All Age Ranges</option>
            {filterOptions.ageRanges.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <select
            value={purchaseModelFilter}
            onChange={(e) => setPurchaseModelFilter(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer hover:border-gray-300"
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
            className="px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all cursor-pointer hover:border-gray-300"
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
        <div className="text-center py-20 text-slate-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
          No product profiles found. {query ? "Try a different search term." : ""}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((p) => {
            const sf = p.structured_fields;
            const rating = sf.user_rating ? Number(sf.user_rating) : null;
            const reviewCount = sf.review_count ? Number(sf.review_count) : null;
            const initial = p.entity_name.charAt(0).toUpperCase();
            const gradient = getCategoryGradient(sf.primary_category);
            return (
              <Link
                key={p.entity_id}
                href={`/products/${p.entity_id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/5 hover:border-gray-300 transition-all duration-300 hover:-translate-y-0.5"
              >
                {/* Gradient header with monogram */}
                <div className={`h-28 bg-gradient-to-br ${gradient} relative flex items-center justify-center`}>
                  <span className="text-5xl font-bold text-white/25 select-none">{initial}</span>
                  {rating !== null ? (
                    <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-sm rounded-full px-2 py-0.5 flex items-center gap-1 shadow-sm">
                      <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                      <span className="text-[11px] font-semibold text-slate-700">{rating.toFixed(1)}</span>
                    </div>
                  ) : null}
                  {reviewCount !== null && reviewCount > 0 ? (
                    <div className="absolute bottom-2.5 right-2.5 bg-white/80 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm">
                      <span className="text-[10px] font-medium text-slate-600">{reviewCount} reviews</span>
                    </div>
                  ) : null}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-slate-800 truncate group-hover:text-emerald-600 transition-colors">
                    {p.entity_name}
                  </h3>

                  {sf.primary_category ? (
                    <span className={`inline-block mt-2 px-2 py-0.5 rounded-md text-[10px] font-medium border ${getCategoryColor(sf.primary_category)}`}>
                      {sf.primary_category}
                    </span>
                  ) : null}

                  {sf.age_range ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(Array.isArray(sf.age_range) ? sf.age_range : [sf.age_range]).map((a: string) => (
                        <span key={a} className="px-1.5 py-0.5 bg-slate-50 text-slate-500 rounded text-[10px] font-medium border border-slate-100">
                          {a}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {sf.subjects ? (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {(sf.subjects as string[]).slice(0, 3).map((s: string) => (
                        <span key={s} className="px-1.5 py-0.5 bg-gray-50 text-slate-500 rounded text-[10px] border border-gray-100">
                          {s}
                        </span>
                      ))}
                      {(sf.subjects as string[]).length > 3 ? (
                        <span className="text-[10px] text-slate-400 font-medium self-center">+{(sf.subjects as string[]).length - 3}</span>
                      ) : null}
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

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface SearchResult {
  entity_id: string;
  entity_name: string;
  entity_type: string;
  structured_fields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface EntitySearchSelectProps {
  entityType: string;
  onSelect: (id: string, name: string) => void;
  placeholder?: string;
  selectedId?: string;
  selectedName?: string;
  onClear?: () => void;
}

export default function EntitySearchSelect({
  entityType,
  onSelect,
  placeholder,
  selectedId,
  selectedName,
  onClear,
}: EntitySearchSelectProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(
    async (q: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ type: entityType });
        if (q) params.set("q", q);
        const res = await fetch(`/api/profiles/search?${params}&limit=10`);
        const data = await res.json();
        setResults(data.profiles || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    },
    [entityType]
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, open, search]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = (item: SearchResult) => {
    onSelect(item.entity_id, item.entity_name);
    setQuery("");
    setOpen(false);
  };

  const handleFocus = () => {
    setOpen(true);
    if (results.length === 0) search(query);
  };

  return (
    <div ref={containerRef} className="relative">
      {selectedId && selectedName ? (
        <div className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white/80 text-sm">
          <div className="flex-1 flex items-center gap-2 min-w-0">
            <span className="font-medium text-slate-800 truncate">{selectedName}</span>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{selectedId}</span>
          </div>
          {onClear && (
            <button
              onClick={onClear}
              className="text-slate-400 hover:text-red-500 transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
            placeholder={placeholder || `Search ${entityType}s by name...`}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm bg-white/80 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400 transition-all"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-3.5 h-3.5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Dropdown */}
      {open && !selectedId && (
        <div className="absolute z-50 mt-1 w-full bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-fade-in-up max-h-60 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              {query ? "No results found" : "Type to search..."}
            </div>
          ) : (
            results.map((item) => (
              <button
                key={item.entity_id}
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-2.5 hover:bg-brand-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{item.entity_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{item.entity_id}</div>
                </div>
                <svg className="w-3.5 h-3.5 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

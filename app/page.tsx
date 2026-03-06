"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (target === 0) return;
    let start = 0;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(eased * target);
      if (current !== start) {
        start = current;
        setCount(current);
      }
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);

  return { count, ref };
}

export default function Dashboard() {
  const [stats, setStats] = useState({ schools: 0, products: 0 });
  const [loaded, setLoaded] = useState(false);
  const [topMatches, setTopMatches] = useState<Array<{ school_name: string; school_id: string; product_name: string; product_id: string; score: number }>>([]);

  useEffect(() => {
    async function loadStats() {
      try {
        const [schoolRes, productRes] = await Promise.all([
          fetch("/api/profiles/search?type=school"),
          fetch("/api/profiles/search?type=product"),
        ]);
        const schoolData = await schoolRes.json();
        const productData = await productRes.json();
        setStats({
          schools: schoolData.counts?.find?.((c: { entity_type: string; count: string }) => c.entity_type === "school")?.count ?? schoolData.profiles?.length ?? 0,
          products: schoolData.counts?.find?.((c: { entity_type: string; count: string }) => c.entity_type === "product")?.count ?? productData.profiles?.length ?? 0,
        });
        // Load sample top matches from a random school
        const schoolProfiles = schoolData.profiles || [];
        if (schoolProfiles.length > 0) {
          const sample = schoolProfiles[Math.floor(Math.random() * Math.min(schoolProfiles.length, 5))];
          const recRes = await fetch(`/api/match/recommend?type=school&id=${sample.entity_id}&top=3`);
          const recData = await recRes.json();
          if (recData.recommendations?.length > 0) {
            setTopMatches(
              recData.recommendations.map((r: { entity_id: string; entity_name: string; match_score: number }) => ({
                school_name: sample.entity_name,
                school_id: sample.entity_id,
                product_name: r.entity_name,
                product_id: r.entity_id,
                score: Math.round(r.match_score * 100),
              }))
            );
          }
        }
      } catch {
        // keep defaults
      } finally {
        setLoaded(true);
      }
    }
    loadStats();
  }, []);

  const schoolCount = useCountUp(loaded ? Number(stats.schools) : 0);
  const productCount = useCountUp(loaded ? Number(stats.products) : 0);

  return (
    <div className="max-w-7xl mx-auto bg-mesh min-h-full">
      {/* Hero */}
      <div className="relative mb-10 rounded-3xl overflow-hidden animate-fade-in-up">
        {/* Animated gradient background */}
        <div className="absolute inset-0 gradient-bg" />
        <div className="absolute inset-0 bg-black/5" />

        {/* Floating decorative orbs */}
        <div className="absolute top-8 right-16 w-48 h-48 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-4 right-40 w-24 h-24 bg-white/8 rounded-full blur-2xl animate-float-delayed" />
        <div className="absolute top-16 left-[40%] w-16 h-16 bg-white/6 rounded-full blur-xl animate-float-slow" />

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />

        <div className="relative z-10 p-10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-soft" />
            <span className="text-white/60 text-xs font-medium uppercase tracking-wider">Live System</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3 text-white">
            Profile Matching Engine
          </h1>
          <p className="text-white/70 text-base max-w-xl leading-relaxed">
            Discover connections between schools and EdTech products through hybrid similarity scoring — combining structured attributes, semantic embeddings, and graph relationships.
          </p>
          <div className="flex gap-3 mt-8">
            <Link
              href="/analyze"
              className="px-6 py-3 bg-white text-brand-700 rounded-xl text-sm font-bold hover:bg-white/90 transition-all duration-300 shadow-xl shadow-black/15 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                AI Deep Analysis
              </span>
            </Link>
            <Link
              href="/graph"
              className="px-6 py-3 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all duration-300 backdrop-blur-md border border-white/20 hover:-translate-y-0.5"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                </svg>
                3D Graph Explorer
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
        {[
          {
            label: "School Profiles",
            value: schoolCount.count,
            href: "/schools",
            color: "blue",
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />,
            delay: "0",
          },
          {
            label: "Product Profiles",
            value: productCount.count,
            href: "/products",
            color: "emerald",
            icon: <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />,
            delay: "100",
          },
          {
            label: "Schema Version",
            value: "v1.0",
            href: "/schema",
            color: "violet",
            icon: <><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></>,
            delay: "200",
          },
        ].map((stat) => {
          const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
            blue: { bg: "bg-blue-500/10", text: "text-blue-500", ring: "ring-blue-500/20" },
            emerald: { bg: "bg-emerald-500/10", text: "text-emerald-500", ring: "ring-emerald-500/20" },
            violet: { bg: "bg-violet-500/10", text: "text-violet-500", ring: "ring-violet-500/20" },
          };
          const c = colorMap[stat.color];
          return (
            <Link
              key={stat.label}
              href={stat.href}
              className="card-glow glass-card p-6 flex items-center gap-5 group animate-fade-in-up"
              style={{ animationDelay: `${stat.delay}ms`, animationFillMode: "both" }}
            >
              <div className={`w-12 h-12 rounded-2xl ${c.bg} flex items-center justify-center ring-1 ${c.ring} transition-transform duration-300 group-hover:scale-110`}>
                <svg className={`w-5 h-5 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  {stat.icon}
                </svg>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div>
                <div className="text-3xl font-extrabold text-slate-800 mt-1 tabular-nums">{stat.value}</div>
              </div>
              <svg className="w-5 h-5 text-slate-300 ml-auto transition-all duration-300 group-hover:text-brand-500 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          );
        })}
      </div>

      {/* Top Matches Showcase */}
      {topMatches.length > 0 && (
        <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "250ms", animationFillMode: "both" }}>
          <div className="flex items-center gap-3 mb-5">
            <h2 className="text-lg font-bold text-slate-800">Top Matches</h2>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold">LIVE</span>
            <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
            <Link href="/match" className="text-xs text-brand-500 hover:text-brand-700 font-semibold">
              View all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topMatches.map((m, i) => (
              <div
                key={`${m.school_id}-${m.product_id}`}
                className="glass-card p-4 group hover:border-rose-200/50 transition-all duration-300 animate-fade-in-up"
                style={{ animationDelay: `${300 + i * 80}ms`, animationFillMode: "both" }}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-extrabold ${m.score >= 60 ? "bg-emerald-50 text-emerald-600" : m.score >= 40 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"}`}>
                    {m.score}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/schools/${m.school_id}`} className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors truncate block">
                      {m.school_name}
                    </Link>
                    <div className="flex items-center gap-1 my-1">
                      <svg className="w-3 h-3 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </div>
                    <Link href={`/products/${m.product_id}`} className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors truncate block">
                      {m.product_name}
                    </Link>
                  </div>
                </div>
                <Link
                  href={`/match?type=school&id=${m.school_id}`}
                  className="mt-3 block text-center text-[10px] font-semibold text-rose-500 hover:text-rose-700 transition-colors pt-2 border-t border-slate-100"
                >
                  See all matches
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Feature cards */}
      <div className="mb-12 animate-fade-in-up" style={{ animationDelay: "300ms", animationFillMode: "both" }}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-bold text-slate-800">Explore</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: "Smart Recommendations", desc: "Cross-type matching: find the best products for a school or best schools for a product", href: "/match", gradient: "from-rose-500 to-pink-600", tag: "NEW", emoji: "match" },
            { title: "AI Deep Analysis", desc: "Claude-powered reasoning to explain why entities match", href: "/analyze", gradient: "from-brand-500 to-violet-600", tag: "AI", emoji: "sparkles" },
            { title: "3D Graph Explorer", desc: "Interactive 3D visualization of entity relationships", href: "/graph", gradient: "from-purple-500 to-pink-500", tag: "3D", emoji: "globe" },
            { title: "Browse Schools", desc: "Search and filter school profiles with smart matching", href: "/schools", gradient: "from-blue-500 to-cyan-500", emoji: "school" },
            { title: "Browse Products", desc: "Explore EdTech product profiles and comparisons", href: "/products", gradient: "from-emerald-500 to-teal-500", emoji: "products" },
            { title: "Compare Entities", desc: "Side-by-side comparison with diff highlighting", href: "/compare", gradient: "from-amber-500 to-orange-500", emoji: "compare" },
            { title: "Schema Manager", desc: "View and evolve profile extraction schemas", href: "/schema", gradient: "from-slate-500 to-slate-600", emoji: "settings" },
          ].map((card, i) => (
            <Link
              key={card.title}
              href={card.href}
              className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/50 p-6 transition-all duration-500 hover:shadow-xl hover:-translate-y-1 hover:border-slate-300/60"
              style={{ animationDelay: `${400 + i * 80}ms`, animationFillMode: "both" }}
            >
              {/* Hover gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${card.gradient} opacity-0 group-hover:opacity-[0.04] transition-opacity duration-500`} />

              {/* Top accent line */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.gradient} transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />

              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-base font-bold text-slate-800 group-hover:text-slate-900 transition-colors">{card.title}</div>
                  {card.tag && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r ${card.gradient} text-white font-bold shadow-sm`}>
                      {card.tag}
                    </span>
                  )}
                </div>
                <div className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-600 transition-colors">{card.desc}</div>

                {/* Arrow */}
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-brand-600 transition-all duration-300">
                  <span>Explore</span>
                  <svg className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="animate-fade-in-up" style={{ animationDelay: "500ms", animationFillMode: "both" }}>
        <div className="flex items-center gap-3 mb-5">
          <h2 className="text-lg font-bold text-slate-800">Matching Architecture</h2>
          <div className="flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent" />
        </div>
        <div className="glass-card-static p-6">
          <div className="grid grid-cols-3 gap-5">
            {[
              {
                title: "Structured Scoring", weight: "35%", color: "blue",
                desc: "JSONB attribute matching with weighted fields",
                items: ["Phase / Category match", "Size / Age range overlap", "Ofsted / Rating proximity"],
              },
              {
                title: "Embedding Similarity", weight: "35%", color: "emerald",
                desc: "pgvector cosine similarity on AI-generated profiles",
                items: ["1536-dim Titan embeddings", "Semantic profile matching", "Natural language similarity"],
              },
              {
                title: "Graph Scoring", weight: "30%", color: "purple",
                desc: "Neo4j Jaccard similarity on shared relationships",
                items: ["Shared taxonomy nodes", "Relationship overlap", "Community detection"],
              },
            ].map((arch) => {
              const colors: Record<string, { bg: string; text: string; dot: string; border: string; weight: string }> = {
                blue: { bg: "bg-blue-50/80", text: "text-blue-700", dot: "bg-blue-400", border: "border-blue-100", weight: "text-blue-500" },
                emerald: { bg: "bg-emerald-50/80", text: "text-emerald-700", dot: "bg-emerald-400", border: "border-emerald-100", weight: "text-emerald-500" },
                purple: { bg: "bg-purple-50/80", text: "text-purple-700", dot: "bg-purple-400", border: "border-purple-100", weight: "text-purple-500" },
              };
              const c = colors[arch.color];
              return (
                <div key={arch.title} className={`${c.bg} rounded-2xl p-5 border ${c.border} transition-all duration-300 hover:shadow-md hover:-translate-y-0.5`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`font-bold text-sm ${c.text}`}>{arch.title}</div>
                    <div className={`text-lg font-extrabold ${c.weight} tabular-nums`}>{arch.weight}</div>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 leading-relaxed">{arch.desc}</p>
                  <ul className="space-y-2">
                    {arch.items.map((item, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-xs text-slate-600">
                        <div className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

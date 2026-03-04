"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [stats, setStats] = useState({ schools: 0, products: 0 });
  const [loaded, setLoaded] = useState(false);

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
          schools: schoolData.counts?.school ?? schoolData.profiles?.length ?? 0,
          products: productData.counts?.product ?? productData.profiles?.length ?? 0,
        });
      } catch {
        // keep defaults
      } finally {
        setLoaded(true);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Hero */}
      <div className="relative mb-10 rounded-2xl overflow-hidden gradient-bg p-8 text-white">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Profile Matching Engine
          </h1>
          <p className="text-white/80 text-base max-w-xl">
            Discover connections between schools and EdTech products through hybrid similarity scoring — combining structured attributes, semantic embeddings, and graph relationships.
          </p>
          <div className="flex gap-3 mt-6">
            <Link
              href="/analyze"
              className="px-5 py-2.5 bg-white text-brand-700 rounded-lg text-sm font-semibold hover:bg-white/90 transition-colors shadow-lg shadow-black/10"
            >
              AI Deep Analysis
            </Link>
            <Link
              href="/graph"
              className="px-5 py-2.5 bg-white/15 text-white rounded-lg text-sm font-semibold hover:bg-white/25 transition-colors backdrop-blur-sm border border-white/20"
            >
              3D Graph Explorer
            </Link>
          </div>
        </div>
        {/* Decorative orbs */}
        <div className="absolute top-4 right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute bottom-0 right-32 w-20 h-20 bg-white/5 rounded-full blur-xl" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
        <StatCard
          label="School Profiles"
          value={loaded ? stats.schools : "..."}
          href="/schools"
          icon={
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
            </div>
          }
          accent="blue"
        />
        <StatCard
          label="Product Profiles"
          value={loaded ? stats.products : "..."}
          href="/products"
          icon={
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            </div>
          }
          accent="emerald"
        />
        <StatCard
          label="Schema Version"
          value="v1.0"
          href="/schema"
          icon={
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
              </svg>
            </div>
          }
          accent="violet"
        />
      </div>

      {/* Feature cards */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Explore</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
        <FeatureCard
          title="AI Deep Analysis"
          description="Claude-powered reasoning to explain why entities match"
          href="/analyze"
          gradient="from-brand-500/10 to-violet-500/10"
          tag="NEW"
        />
        <FeatureCard
          title="3D Graph Explorer"
          description="Interactive 3D visualization of entity relationships"
          href="/graph"
          gradient="from-purple-500/10 to-pink-500/10"
          tag="3D"
        />
        <FeatureCard
          title="Browse Schools"
          description="Search and filter school profiles"
          href="/schools"
          gradient="from-blue-500/10 to-cyan-500/10"
        />
        <FeatureCard
          title="Browse Products"
          description="Explore EdTech product profiles"
          href="/products"
          gradient="from-emerald-500/10 to-teal-500/10"
        />
        <FeatureCard
          title="Compare Entities"
          description="Side-by-side profile comparison with diff highlighting"
          href="/compare"
          gradient="from-amber-500/10 to-orange-500/10"
        />
        <FeatureCard
          title="Schema Manager"
          description="View and evolve profile extraction schemas"
          href="/schema"
          gradient="from-slate-500/10 to-slate-400/10"
        />
      </div>

      {/* Architecture */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">Matching Architecture</h2>
      <div className="glass-card p-6">
        <div className="grid grid-cols-3 gap-4">
          <ArchCard
            title="Structured Scoring"
            weight="35%"
            description="JSONB attribute matching with weighted fields"
            color="blue"
            items={["Phase / Category match", "Size / Age range overlap", "Ofsted / Rating proximity"]}
          />
          <ArchCard
            title="Embedding Similarity"
            weight="35%"
            description="pgvector cosine similarity on AI-generated profiles"
            color="emerald"
            items={["1536-dim Titan embeddings", "Semantic profile matching", "Natural language similarity"]}
          />
          <ArchCard
            title="Graph Scoring"
            weight="30%"
            description="Neo4j Jaccard similarity on shared relationships"
            color="purple"
            items={["Shared taxonomy nodes", "Relationship overlap", "Community detection"]}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  icon,
  accent,
}: {
  label: string;
  value: number | string;
  href: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card p-5 flex items-center gap-4 group hover:scale-[1.02] transition-transform"
    >
      {icon}
      <div>
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
        <div className={`text-2xl font-bold text-slate-800 mt-0.5`}>{value}</div>
      </div>
      <svg className="w-4 h-4 text-slate-300 ml-auto group-hover:text-slate-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

function FeatureCard({
  title,
  description,
  href,
  gradient,
  tag,
}: {
  title: string;
  description: string;
  href: string;
  gradient: string;
  tag?: string;
}) {
  return (
    <Link
      href={href}
      className="glass-card p-5 group hover:scale-[1.01] transition-all relative overflow-hidden"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-50`} />
      <div className="relative">
        <div className="flex items-center gap-2">
          <div className="font-semibold text-slate-800">{title}</div>
          {tag && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-100 text-brand-700 font-bold">
              {tag}
            </span>
          )}
        </div>
        <div className="text-sm text-slate-500 mt-1">{description}</div>
      </div>
    </Link>
  );
}

function ArchCard({
  title,
  weight,
  description,
  color,
  items,
}: {
  title: string;
  weight: string;
  description: string;
  color: string;
  items: string[];
}) {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-400" },
  };
  const c = colors[color];

  return (
    <div className={`${c.bg} rounded-xl p-5 border border-${color}-100`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`font-semibold text-sm ${c.text}`}>{title}</div>
        <div className={`text-xs font-bold ${c.text} opacity-70`}>{weight}</div>
      </div>
      <p className="text-xs text-slate-500 mb-3">{description}</p>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
            <div className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

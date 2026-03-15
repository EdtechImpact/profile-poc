"use client";

import React from "react";
import Link from "next/link";
import { useState, useEffect, use, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { MiniRadar } from "@/app/components/shared/mini-radar";
import { EntityClickContext } from "@/app/components/shared/entity-click-context";
import type { EntityClickHandler } from "@/app/components/shared/entity-click-context";
import { DetailModal } from "@/app/components/chat/DetailModal";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), {
  ssr: false,
}) as any;

interface Profile {
  id: number;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  schema_version: string;
  structured_fields: Record<string, any>;
  profile_text: string;
  profiled_at: string;
}

interface SimilarEntity {
  entity_id: string;
  entity_name: string;
  similarity_score: number;
  structured_score: number;
  embedding_score: number;
  graph_score: number;
  explanation: string;
  structured_fields: Record<string, any>;
}

interface Recommendation {
  entity_id: string;
  entity_name: string;
  match_score: number;
  score_breakdown?: { structured: number; embedding: number; graph: number };
  structured_breakdown?: Record<string, number>;
  structured_fields?: Record<string, any>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface GraphNode {
  id: string;
  label?: string;
  type?: string;
  properties?: Record<string, unknown>;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
  type?: string;
}

const NODE_COLORS: Record<string, string> = {
  School: "#3b82f6",
  Product: "#a855f7",
  Phase: "#6366f1",
  Region: "#06b6d4",
  Subject: "#f59e0b",
  Category: "#10b981",
  Trust: "#64748b",
};

const CROSS_TYPE_DIMS: Record<string, string> = {
  phase_age: "Phase/Age",
  subject: "Subject",
  budget: "Budget",
  pedagogy: "Pedagogy",
  send: "SEND",
  sixth_form: "6th Form",
  impact: "Impact",
};

type TabKey = "profile" | "similar" | "bestfit" | "graph";

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const [modalEntity, setModalEntity] = useState<{ type: "school" | "product"; id: string } | null>(null);
  const handleEntityClick: EntityClickHandler = useCallback((type, id) => {
    setModalEntity({ type, id });
  }, []);

  useEffect(() => {
    fetch(`/api/profiles/product/${slug}`)
      .then((r) => r.json())
      .then((data) => setProfile(data.profile || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const keywords = useMemo(() => {
    if (!profile) return [];
    const sf = profile.structured_fields;
    const kw: string[] = [];
    if (sf.primary_category) kw.push(sf.primary_category);
    if (sf.pedagogy_style) kw.push(sf.pedagogy_style);
    if (sf.purchase_model) kw.push(sf.purchase_model);
    if (sf.subjects && Array.isArray(sf.subjects)) kw.push(...sf.subjects);
    return kw.filter(Boolean);
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          Loading product profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <div className="text-slate-400 mb-4">Product profile not found: {slug}</div>
        <Link href="/products" className="text-emerald-600 hover:underline">Back to products</Link>
      </div>
    );
  }

  const sf = profile.structured_fields as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "similar", label: "Similar Products" },
    { key: "bestfit", label: "Best Fit Schools" },
    { key: "graph", label: "Graph" },
  ];

  return (
    <EntityClickContext.Provider value={handleEntityClick}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-400 mb-4 flex items-center gap-1.5 animate-fade-in">
          <Link href="/products" className="hover:text-emerald-600 transition-colors">Products</Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-600 font-medium">{profile.entity_name}</span>
        </div>

        {/* Header */}
        <div className="glass-card p-6 mb-6 animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="relative flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">{profile.entity_name}</h1>
              <div className="flex gap-2 mt-3 flex-wrap">
                {sf.primary_category ? (
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-100 shadow-sm">
                    {sf.primary_category as string}
                  </span>
                ) : null}
                {sf.age_range ? (
                  <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                    Ages: {sf.age_range as string}
                  </span>
                ) : null}
                {sf.purchase_model ? (
                  <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                    {sf.purchase_model as string}
                  </span>
                ) : null}
                {sf.user_rating ? (
                  <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100 shadow-sm flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    {sf.user_rating}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/analyze?type=product&id=${slug}`} className="px-3 py-1.5 text-sm bg-brand-50 text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-100 hover:shadow-sm transition-all font-medium">
                AI Analysis
              </Link>
              <Link href={`/graph?type=product&id=${slug}`} className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 hover:shadow-sm transition-all font-medium">
                3D Graph
              </Link>
              <Link href={`/compare?type=product&ids=${slug}`} className="px-3 py-1.5 text-sm bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 hover:shadow-sm transition-all font-medium">
                Compare
              </Link>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 border-b border-slate-200/60">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-all border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "text-brand-600 border-brand-500"
                  : "text-slate-400 border-transparent hover:text-slate-600 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "profile" ? (
          <ProductProfileTab profile={profile} sf={sf} keywords={keywords} />
        ) : activeTab === "similar" ? (
          <SimilarProductsTab slug={slug} sourceFields={profile.structured_fields} />
        ) : activeTab === "bestfit" ? (
          <BestFitSchoolsTab slug={slug} />
        ) : (
          <ProductGraphTab slug={slug} onEntityClick={handleEntityClick} />
        )}
      </div>

      {/* Detail Modal */}
      {modalEntity ? (
        <DetailModal
          entityType={modalEntity.type}
          entityId={modalEntity.id}
          onClose={() => setModalEntity(null)}
        />
      ) : null}
    </EntityClickContext.Provider>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProductProfileTab({ profile, sf, keywords }: { profile: Profile; sf: Record<string, any>; keywords: string[] }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <div className="space-y-5 animate-fade-in-up">
      {profile.profile_text ? (
        <div className="glass-card p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Profile Summary
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            <HighlightedText text={profile.profile_text} keywords={keywords} />
          </p>
        </div>
      ) : null}

      {sf.subjects && (sf.subjects as string[]).length > 0 ? (
        <div className="glass-card p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            Subjects
          </h2>
          <div className="flex flex-wrap gap-2">
            {(sf.subjects as string[]).map((s: string, i: number) => (
              <span key={s} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl text-sm font-medium border border-blue-100 hover:bg-blue-100 transition-colors cursor-default animate-scale-in" style={{ animationDelay: `${0.2 + i * 0.05}s`, animationFillMode: "both" }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {sf.key_features && (sf.key_features as string[]).length > 0 ? (
        <div className="glass-card p-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Key Features
          </h2>
          <div className="space-y-2">
            {(sf.key_features as string[]).map((f: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-sm text-slate-700 animate-slide-up" style={{ animationDelay: `${0.25 + i * 0.05}s`, animationFillMode: "both" }}>
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                {f}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="glass-card p-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          All Profile Fields
        </h2>
        <div className="grid grid-cols-1 gap-y-3 text-sm">
          {Object.entries(sf).map(([key, value]) => (
            <div key={key} className="flex justify-between items-baseline py-1.5 border-b border-slate-100/60 hover:bg-slate-50/50 rounded px-1 -mx-1 transition-colors">
              <span className="text-slate-400 text-xs capitalize">{key.replace(/_/g, " ")}</span>
              <span className="text-slate-800 font-medium text-right max-w-xs text-xs">
                {Array.isArray(value) ? (
                  <span className="flex flex-wrap gap-1 justify-end">
                    {value.map((v: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[11px] border border-emerald-100/50">{v}</span>
                    ))}
                  </span>
                ) : (
                  String(value ?? "-")
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card-static p-3 text-[11px] text-slate-400 flex items-center gap-2 animate-fade-in">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Schema v{profile.schema_version} | Profiled {new Date(profile.profiled_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ─── Similar Products Tab ────────────────────────────────────────────────────

function SimilarProductsTab({ slug, sourceFields }: { slug: string; sourceFields: Record<string, any> }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [similar, setSimilar] = useState<SimilarEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/similar/product/${slug}?top=10`)
      .then((r) => r.json())
      .then((data) => setSimilar(data.similar || []))
      .catch(() => setSimilar([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (similar.length === 0) {
    return <div className="glass-card p-6 text-sm text-slate-400 text-center">No similarity data computed yet.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {similar.map((item, i) => {
        const score = Math.round(item.similarity_score * 100);
        const scoreColor = score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-500 bg-red-50 border-red-200";

        const matchingFields: string[] = [];
        const isf = item.structured_fields || {};
        if (isf.primary_category && isf.primary_category === sourceFields.primary_category) matchingFields.push("category");
        if (isf.pedagogy_style && isf.pedagogy_style === sourceFields.pedagogy_style) matchingFields.push("pedagogy");
        if (isf.purchase_model && isf.purchase_model === sourceFields.purchase_model) matchingFields.push("model");
        if (isf.subjects && sourceFields.subjects) {
          const overlap = (isf.subjects as string[]).filter((s: string) => (sourceFields.subjects as string[]).includes(s));
          if (overlap.length > 0) matchingFields.push(...overlap.map((s: string) => `subject: ${s}`));
        }

        const radarDims = [
          { label: "Structured", value: item.structured_score },
          { label: "Embedding", value: item.embedding_score },
          { label: "Graph", value: item.graph_score || 0 },
        ];

        return (
          <div key={item.entity_id} className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <ClickableEntity entityType="product" entityId={item.entity_id} name={item.entity_name} />
                  <span className={`px-3 py-1.5 rounded-xl border text-sm font-extrabold shrink-0 ${scoreColor}`}>
                    {score}%
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  <div className="shrink-0">
                    <MiniRadar dimensions={radarDims} size={180} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
                        <span className="text-slate-500">Structured</span>
                        <span className="font-bold text-slate-700 ml-auto">{Math.round(item.structured_score * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-slate-500">Embedding</span>
                        <span className="font-bold text-slate-700 ml-auto">{Math.round(item.embedding_score * 100)}%</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />
                        <span className="text-slate-500">Graph</span>
                        <span className="font-bold text-slate-700 ml-auto">{Math.round((item.graph_score || 0) * 100)}%</span>
                      </div>
                    </div>

                    {matchingFields.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {matchingFields.slice(0, 5).map((f) => (
                          <span key={f} className="keyword-match text-[10px]">{f}</span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {item.explanation ? (
                  <div className="mt-3">
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="text-[11px] text-brand-500 hover:text-brand-700 font-medium flex items-center gap-1"
                    >
                      <svg className={`w-3 h-3 transition-transform ${expandedIdx === i ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      Why similar?
                    </button>
                    {expandedIdx === i ? (
                      <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed pl-4">{item.explanation}</p>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-3">
                  <Link
                    href={`/chat?q=${encodeURIComponent(`Compare product ${slug} with ${item.entity_name} (${item.entity_id}). What are the key differences?`)}`}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 transition-all font-medium"
                  >
                    Ask Advisor
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Best Fit Schools Tab ────────────────────────────────────────────────────

function BestFitSchoolsTab({ slug }: { slug: string }) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/match/recommend?type=product&id=${slug}&top=10`)
      .then((r) => r.json())
      .then((data) => setRecs(data.recommendations || []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (recs.length === 0) {
    return <div className="glass-card p-6 text-sm text-slate-400 text-center">No best-fit schools available yet.</div>;
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {recs.map((rec, i) => {
        const score = Math.round(rec.match_score * 100);
        const scoreColor = score >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-500 bg-red-50 border-red-200";
        const breakdown = rec.score_breakdown;
        const sf = rec.structured_fields || {};
        const structBd = rec.structured_breakdown || {};

        const radarDims = Object.entries(CROSS_TYPE_DIMS).map(([key, label]) => ({
          label,
          value: structBd[key] != null ? Number(structBd[key]) : 0,
        }));
        const hasRadar = radarDims.some((d) => d.value > 0);

        return (
          <div key={rec.entity_id} className="glass-card p-5 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, animationFillMode: "both" }}>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-sm font-bold shrink-0">
                {i + 1}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <ClickableEntity entityType="school" entityId={rec.entity_id} name={rec.entity_name} />
                  <span className={`px-3 py-1.5 rounded-xl border text-sm font-extrabold shrink-0 ${scoreColor}`}>
                    {score}%
                  </span>
                </div>

                <div className="flex items-center gap-6">
                  {hasRadar ? (
                    <div className="shrink-0">
                      <MiniRadar dimensions={radarDims} size={200} />
                    </div>
                  ) : null}

                  <div className="flex-1 min-w-0 space-y-3">
                    {breakdown ? (
                      <div>
                        <div className="flex w-full h-2.5 rounded-full overflow-hidden bg-slate-100">
                          {(() => {
                            const s = breakdown.structured || 0;
                            const e = breakdown.embedding || 0;
                            const g = breakdown.graph || 0;
                            const total = s + e + g;
                            if (total === 0) return null;
                            return (
                              <>
                                <div className="h-full bg-blue-400" style={{ width: `${(s / total) * 100}%` }} title={`Structured: ${Math.round(s * 100)}%`} />
                                <div className="h-full bg-emerald-400" style={{ width: `${(e / total) * 100}%` }} title={`Embedding: ${Math.round(e * 100)}%`} />
                                <div className="h-full bg-purple-400" style={{ width: `${(g / total) * 100}%` }} title={`Graph: ${Math.round(g * 100)}%`} />
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex gap-3 mt-1 text-[10px] text-slate-400">
                          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" />{Math.round((breakdown.structured || 0) * 100)}%</span>
                          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />{Math.round((breakdown.embedding || 0) * 100)}%</span>
                          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full inline-block" />{Math.round((breakdown.graph || 0) * 100)}%</span>
                        </div>
                      </div>
                    ) : null}

                    <div className="flex flex-wrap gap-1.5">
                      {sf.phase ? <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">{sf.phase}</span> : null}
                      {sf.region ? <span className="text-[10px] px-2 py-0.5 bg-cyan-50 text-cyan-600 rounded-lg border border-cyan-100">{sf.region}</span> : null}
                      {sf.ofsted_rating ? <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">{sf.ofsted_rating}</span> : null}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <Link
                    href={`/chat?q=${encodeURIComponent(`Why is school ${rec.entity_id} (${rec.entity_name}) a good fit for product ${slug}? Analyze the match.`)}`}
                    className="text-[11px] px-3 py-1.5 rounded-lg bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 transition-all font-medium"
                  >
                    Ask Advisor
                  </Link>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Graph Tab ───────────────────────────────────────────────────────────────

function ProductGraphTab({ slug, onEntityClick }: { slug: string; onEntityClick: EntityClickHandler }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(true);
  const graphRef = React.useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    setLoading(true);
    fetch(`/api/graph/neighbors/product/${slug}?depth=${depth}`)
      .then((r) => r.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setLinks(data.links || []);
      })
      .catch(() => {
        setNodes([]);
        setLinks([]);
      })
      .finally(() => setLoading(false));
  }, [slug, depth]);

  useEffect(() => {
    if (graphRef.current) {
      graphRef.current.d3Force("charge")?.strength(-120);
      graphRef.current.d3Force("link")?.distance(60);
      setTimeout(() => {
        graphRef.current?.zoomToFit(400, 30);
      }, 500);
    }
  }, [nodes]);

  const paintNode = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const label = node.label || node.id;
      const fontSize = 10 / globalScale;
      const r = 5;
      const color = NODE_COLORS[node.type || ""] || "#94a3b8";
      ctx.beginPath();
      ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 1.5 / globalScale;
      ctx.stroke();
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "#334155";
      const displayLabel = label.length > 18 ? label.slice(0, 16) + "..." : label;
      ctx.fillText(displayLabel, node.x, node.y + r + 2 / globalScale);
    },
    []
  );

  const handleNodeClick = useCallback(
    (node: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const nodeType = (node.type || "").toLowerCase();
      if (nodeType === "school" || nodeType === "product") {
        onEntityClick(nodeType as "school" | "product", node.id);
      }
    },
    [onEntityClick]
  );

  const types = Array.from(new Set(nodes.map((n) => n.type).filter(Boolean))) as string[];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-xs font-semibold text-slate-500">Depth:</span>
        {[1, 2, 3].map((d) => (
          <button
            key={d}
            onClick={() => setDepth(d)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              depth === d
                ? "bg-brand-500 text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {d} hop{d > 1 ? "s" : ""}
          </button>
        ))}
        <span className="text-[10px] text-slate-400 ml-auto">{nodes.length} nodes, {links.length} links</span>
      </div>

      {nodes.length > 0 ? (
        <div className="glass-card overflow-hidden">
          <ForceGraph2D
            ref={graphRef}
            graphData={{ nodes: [...nodes], links: [...links] }}
            width={800}
            height={500}
            nodeCanvasObject={paintNode}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => { // eslint-disable-line @typescript-eslint/no-explicit-any
              ctx.beginPath();
              ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI);
              ctx.fillStyle = color;
              ctx.fill();
            }}
            onNodeClick={handleNodeClick}
            linkColor={() => "#cbd5e1"}
            linkWidth={1}
            linkDirectionalArrowLength={0}
            cooldownTicks={80}
            enableZoomInteraction={true}
            enablePanInteraction={true}
          />
        </div>
      ) : (
        <div className="glass-card p-6 text-sm text-slate-400 text-center">No graph data available.</div>
      )}

      {types.length > 0 ? (
        <div className="flex flex-wrap gap-3 mt-4">
          {types.map((t) => (
            <div key={t} className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS[t] || "#94a3b8" }} />
              <span className="text-xs text-slate-500">{t}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Shared Utility Components ───────────────────────────────────────────────

function ClickableEntity({ entityType, entityId, name }: { entityType: "school" | "product"; entityId: string; name: string }) {
  const onEntityClick = React.useContext(EntityClickContext);
  return (
    <button
      onClick={() => onEntityClick?.(entityType, entityId)}
      className="text-sm font-semibold text-slate-800 hover:text-brand-600 transition-colors truncate text-left"
    >
      {name || entityId}
    </button>
  );
}

function HighlightedText({ text, keywords }: { text: string; keywords: string[] }) {
  if (!keywords.length) return <>{text}</>;
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => {
        const isMatch = keywords.some((k) => k.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <mark key={i} className="keyword-match">{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        );
      })}
    </>
  );
}

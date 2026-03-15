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
/* eslint-enable @typescript-eslint/no-explicit-any */

interface Profile {
  id: number;
  entity_type: string;
  entity_id: string;
  entity_name: string;
  schema_version: string;
  structured_fields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
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
  structured_fields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface Recommendation {
  entity_id: string;
  entity_name: string;
  match_score: number;
  score_breakdown?: { structured: number; embedding: number; graph: number };
  structured_breakdown?: Record<string, number>;
  structured_fields?: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

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

const PHASE_THEME: Record<string, { accent: string; bg: string; light: string }> = {
  Primary: { accent: "#3b82f6", bg: "bg-blue-500", light: "text-blue-600" },
  Secondary: { accent: "#8b5cf6", bg: "bg-violet-500", light: "text-violet-600" },
};

function getPhaseTheme(phase: string) {
  if (!phase) return { accent: "#64748b", bg: "bg-slate-500", light: "text-slate-600" };
  for (const [key, val] of Object.entries(PHASE_THEME)) {
    if (phase.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return { accent: "#64748b", bg: "bg-slate-500", light: "text-slate-600" };
}

type TabKey = "profile" | "similar" | "recommendations" | "graph";

export default function SchoolDetailPage({
  params,
}: {
  params: Promise<{ urn: string }>;
}) {
  const { urn } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  const [modalEntity, setModalEntity] = useState<{ type: "school" | "product"; id: string } | null>(null);
  const handleEntityClick: EntityClickHandler = useCallback((type, id) => {
    setModalEntity({ type, id });
  }, []);

  useEffect(() => {
    fetch(`/api/profiles/school/${urn}`)
      .then((r) => r.json())
      .then((data) => setProfile(data.profile || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [urn]);

  const keywords = useMemo(() => {
    if (!profile) return [];
    const sf = profile.structured_fields;
    const kw: string[] = [];
    if (sf.phase) kw.push(sf.phase);
    if (sf.type) kw.push(sf.type);
    if (sf.region) kw.push(sf.region);
    if (sf.ofsted_rating) kw.push(sf.ofsted_rating);
    if (sf.size_band) kw.push(sf.size_band);
    if (sf.fsm_band) kw.push(sf.fsm_band);
    if (sf.trust_name) kw.push(sf.trust_name);
    return kw.filter(Boolean);
  }, [profile]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-4 bg-slate-200 rounded w-48 mb-6" />
          <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-6">
            <div className="h-7 bg-slate-200 rounded w-2/3 mb-3" />
            <div className="flex gap-2">
              <div className="h-6 bg-slate-100 rounded-lg w-20" />
              <div className="h-6 bg-slate-100 rounded-lg w-24" />
              <div className="h-6 bg-slate-100 rounded-lg w-20" />
            </div>
          </div>
          <div className="flex gap-1 mb-6">
            {[1,2,3,4].map(i => <div key={i} className="h-9 bg-slate-100 rounded w-28" />)}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl p-6">
            <div className="h-4 bg-slate-200 rounded w-32 mb-4" />
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-5/6" />
              <div className="h-3 bg-slate-100 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm mb-2">School profile not found for URN: {urn}</p>
        <Link href="/schools" className="text-brand-600 hover:underline text-sm">Back to schools</Link>
      </div>
    );
  }

  const sf = profile.structured_fields as Record<string, string | string[]>;
  const phaseTheme = getPhaseTheme(sf.phase as string);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "profile", label: "Profile" },
    { key: "similar", label: "Similar Schools" },
    { key: "recommendations", label: "Recommendations" },
    { key: "graph", label: "Graph" },
  ];

  return (
    <EntityClickContext.Provider value={handleEntityClick}>
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
          <Link href="/schools" className="hover:text-brand-600 transition-colors">Schools</Link>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          <span className="text-slate-600 font-medium">{profile.entity_name}</span>
        </div>

        {/* Header Card */}
        <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden mb-6 shadow-sm">
          <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${phaseTheme.accent}, ${phaseTheme.accent}88, transparent)` }} />
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl ${phaseTheme.bg} flex items-center justify-center text-white font-bold text-xl shadow-lg shrink-0`}
                  style={{ boxShadow: `0 4px 14px ${phaseTheme.accent}33` }}
                >
                  {profile.entity_name.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-800">{profile.entity_name}</h1>
                  <div className="flex gap-2 mt-2.5 flex-wrap">
                    <span className="px-2.5 py-1 bg-brand-50 text-brand-700 rounded-lg text-xs font-semibold border border-brand-100">
                      URN: {profile.entity_id}
                    </span>
                    {sf.phase ? (
                      <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                        {sf.phase as string}
                      </span>
                    ) : null}
                    {sf.type ? (
                      <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                        {sf.type as string}
                      </span>
                    ) : null}
                    {sf.ofsted_rating ? <OfstedBadge rating={sf.ofsted_rating as string} /> : null}
                    {sf.region ? (
                      <span className="px-2.5 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-medium border border-slate-100">
                        {sf.region as string}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/analyze?type=school&id=${urn}`} className="px-3 py-1.5 text-xs bg-brand-50 text-brand-700 border border-brand-200 rounded-xl hover:bg-brand-100 hover:shadow-sm transition-all font-medium">
                  AI Analysis
                </Link>
                <Link href={`/graph?type=school&id=${urn}`} className="px-3 py-1.5 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-xl hover:bg-purple-100 hover:shadow-sm transition-all font-medium">
                  3D Graph
                </Link>
                <Link href={`/compare?type=school&ids=${urn}`} className="px-3 py-1.5 text-xs bg-slate-50 text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-100 hover:shadow-sm transition-all font-medium">
                  Compare
                </Link>
              </div>
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
          <ProfileTab profile={profile} sf={sf} keywords={keywords} />
        ) : activeTab === "similar" ? (
          <SimilarTab urn={urn} sourceFields={profile.structured_fields} />
        ) : activeTab === "recommendations" ? (
          <RecommendationsTab urn={urn} />
        ) : (
          <GraphTab urn={urn} onEntityClick={handleEntityClick} />
        )}
      </div>

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

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
      <span className="text-slate-400 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-semibold text-slate-600 w-8 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

// ─── Profile Tab ─────────────────────────────────────────────────────────────

function ProfileTab({ profile, sf, keywords }: { profile: Profile; sf: Record<string, string | string[]>; keywords: string[] }) {
  return (
    <div className="space-y-5">
      {profile.profile_text ? (
        <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />
            Profile Summary
          </h2>
          <p className="text-slate-700 leading-relaxed text-sm">
            <HighlightedText text={profile.profile_text} keywords={keywords} />
          </p>
        </div>
      ) : null}

      <div className="bg-white border border-gray-200/80 rounded-2xl p-6 shadow-sm">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
          Profile Fields
        </h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {Object.entries(sf).map(([key, value]) => (
            <div key={key} className="flex justify-between items-baseline py-1.5 border-b border-slate-100/60 hover:bg-slate-50/50 rounded px-1 -mx-1 transition-colors">
              <span className="text-slate-400 text-xs capitalize">{key.replace(/_/g, " ")}</span>
              <span className="text-slate-800 font-medium text-right text-xs">
                {Array.isArray(value) ? (
                  <span className="flex flex-wrap gap-1 justify-end">
                    {value.map((v, i) => (
                      <span key={i} className="px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded-md text-[11px] border border-brand-100/50">{v}</span>
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

      <div className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 text-[11px] text-slate-400 flex items-center gap-2">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Schema v{profile.schema_version} | Profiled {new Date(profile.profiled_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ─── Similar Schools Tab ─────────────────────────────────────────────────────

function SimilarTab({ urn, sourceFields }: { urn: string; sourceFields: Record<string, any> }) { // eslint-disable-line @typescript-eslint/no-explicit-any
  const [similar, setSimilar] = useState<SimilarEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/similar/school/${urn}?top=10`)
      .then((r) => r.json())
      .then((data) => setSimilar(data.similar || []))
      .catch(() => setSimilar([]))
      .finally(() => setLoading(false));
  }, [urn]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
              <div className="h-4 bg-slate-200 rounded w-48" />
              <div className="ml-auto h-6 w-14 bg-slate-200 rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="h-2 bg-slate-100 rounded w-full" />
              <div className="h-2 bg-slate-100 rounded w-3/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (similar.length === 0) {
    return (
      <div className="bg-white border border-gray-200/80 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">No similarity data computed yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {similar.map((item, i) => {
        const score = Math.round(item.similarity_score * 100);
        const scoreColor = score >= 75 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-slate-500 bg-slate-50 border-slate-200";

        const matchingFields: string[] = [];
        const isf = item.structured_fields || {};
        if (isf.phase && isf.phase === sourceFields.phase) matchingFields.push("phase");
        if (isf.type && isf.type === sourceFields.type) matchingFields.push("type");
        if (isf.region && isf.region === sourceFields.region) matchingFields.push("region");
        if (isf.ofsted_rating && isf.ofsted_rating === sourceFields.ofsted_rating) matchingFields.push("ofsted");
        if (isf.trust_name && isf.trust_name === sourceFields.trust_name) matchingFields.push("trust");
        if (isf.size_band && isf.size_band === sourceFields.size_band) matchingFields.push("size");

        return (
          <div key={item.entity_id} className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
            <div className="p-5">
              {/* Top row: rank + name + score */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <SimilarSchoolClickable entityId={item.entity_id} name={item.entity_name} />
                {isf.region ? (
                  <span className="text-[11px] text-slate-400 hidden md:block">{isf.region}</span>
                ) : null}
                <span className={`ml-auto px-3 py-1 rounded-xl border text-sm font-extrabold shrink-0 ${scoreColor}`}>
                  {score}%
                </span>
              </div>

              {/* Score bars */}
              <div className="space-y-1.5 mb-4">
                <ScoreBar value={item.structured_score} color="bg-blue-400" label="Structured" />
                <ScoreBar value={item.embedding_score} color="bg-emerald-400" label="Embedding" />
                <ScoreBar value={item.graph_score || 0} color="bg-purple-400" label="Graph" />
              </div>

              {/* Bottom row: matching fields + actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex flex-wrap gap-1.5">
                  {matchingFields.length > 0 ? (
                    matchingFields.map((f) => (
                      <span key={f} className="px-2 py-0.5 bg-brand-50 text-brand-600 rounded-md text-[10px] font-semibold border border-brand-100 capitalize">{f}</span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-300">No field matches</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.explanation ? (
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="text-[11px] text-slate-400 hover:text-brand-600 font-medium flex items-center gap-1 transition-colors"
                    >
                      <svg className={`w-3 h-3 transition-transform ${expandedIdx === i ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                      Why?
                    </button>
                  ) : null}
                  <button
                    onClick={() => {
                      window.dispatchEvent(new CustomEvent("open-advisor", {
                        detail: { query: `Tell me why school ${urn} is similar to ${item.entity_name} (${item.entity_id}) and what they can learn from each other` },
                      }));
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 transition-all font-medium"
                  >
                    Ask Advisor
                  </button>
                </div>
              </div>

              {/* Expandable explanation */}
              {expandedIdx === i && item.explanation ? (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-slate-500 leading-relaxed">{item.explanation}</p>
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SimilarSchoolClickable({ entityId, name }: { entityId: string; name: string }) {
  const onEntityClick = React.useContext(EntityClickContext);
  return (
    <button
      onClick={() => onEntityClick?.("school", entityId)}
      className="text-sm font-semibold text-slate-800 hover:text-brand-600 transition-colors truncate text-left"
    >
      {name}
    </button>
  );
}

// ─── Recommendations Tab ─────────────────────────────────────────────────────

const CROSS_TYPE_DIMS: Record<string, string> = {
  phase_age: "Phase/Age",
  subject: "Subject",
  budget: "Budget",
  pedagogy: "Pedagogy",
  send: "SEND",
  sixth_form: "6th Form",
  impact: "Impact",
};

function RecommendationsTab({ urn }: { urn: string }) {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/match/recommend?type=school&id=${urn}&top=10`)
      .then((r) => r.json())
      .then((data) => setRecs(data.recommendations || []))
      .catch(() => setRecs([]))
      .finally(() => setLoading(false));
  }, [urn]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-slate-200" />
              <div className="h-4 bg-slate-200 rounded w-48" />
              <div className="ml-auto h-6 w-14 bg-slate-200 rounded-lg" />
            </div>
            <div className="h-2.5 bg-slate-100 rounded w-full mb-3" />
            <div className="flex gap-1.5">
              <div className="h-5 bg-slate-100 rounded-md w-16" />
              <div className="h-5 bg-slate-100 rounded-md w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <div className="bg-white border border-gray-200/80 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
          </svg>
        </div>
        <p className="text-sm text-slate-500">No recommendations available yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recs.map((rec, i) => {
        const score = Math.round(rec.match_score * 100);
        const scoreColor = score >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200" : score >= 50 ? "text-amber-600 bg-amber-50 border-amber-200" : "text-slate-500 bg-slate-50 border-slate-200";
        const breakdown = rec.score_breakdown;
        const sf = rec.structured_fields || {};
        const structBd = rec.structured_breakdown || {};

        const radarDims = Object.entries(CROSS_TYPE_DIMS).map(([key, label]) => ({
          label,
          value: structBd[key] != null ? Number(structBd[key]) : 0,
        }));
        const hasRadar = radarDims.some((d) => d.value > 0);

        return (
          <div key={rec.entity_id} className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-gray-300 transition-all">
            <div className="p-5">
              {/* Top row */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {i + 1}
                </div>
                <RecProductClickable entityId={rec.entity_id} name={rec.entity_name} />
                <span className={`ml-auto px-3 py-1 rounded-xl border text-sm font-extrabold shrink-0 ${scoreColor}`}>
                  {score}%
                </span>
              </div>

              <div className="flex items-start gap-6">
                {/* Radar chart - compact */}
                {hasRadar ? (
                  <div className="shrink-0">
                    <MiniRadar dimensions={radarDims} size={140} />
                  </div>
                ) : null}

                <div className="flex-1 min-w-0 space-y-3">
                  {/* Score breakdown bars */}
                  {breakdown ? (
                    <div className="space-y-1.5">
                      <ScoreBar value={breakdown.structured || 0} color="bg-blue-400" label="Structured" />
                      <ScoreBar value={breakdown.embedding || 0} color="bg-emerald-400" label="Embedding" />
                      <ScoreBar value={breakdown.graph || 0} color="bg-purple-400" label="Graph" />
                    </div>
                  ) : null}

                  {/* Product attributes */}
                  <div className="flex flex-wrap gap-1.5">
                    {sf.pedagogy_style ? <span className="text-[10px] px-2 py-0.5 bg-violet-50 text-violet-600 rounded-md border border-violet-100 font-medium">{sf.pedagogy_style}</span> : null}
                    {sf.send_suitability ? <span className="text-[10px] px-2 py-0.5 bg-teal-50 text-teal-600 rounded-md border border-teal-100 font-medium">{sf.send_suitability}</span> : null}
                    {sf.target_school_type && Array.isArray(sf.target_school_type) ? (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-500 rounded-md border border-slate-100 font-medium">{sf.target_school_type.length} school types</span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Bottom actions */}
              <div className="flex items-center justify-end pt-3 mt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("open-advisor", {
                      detail: { query: `Why is ${rec.entity_name} a good product recommendation for school ${urn}? Analyze the match in detail.` },
                    }));
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-brand-50 text-brand-600 border border-brand-200 hover:bg-brand-100 transition-all font-medium"
                >
                  Ask Advisor
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecProductClickable({ entityId, name }: { entityId: string; name: string }) {
  const onEntityClick = React.useContext(EntityClickContext);
  return (
    <button
      onClick={() => onEntityClick?.("product", entityId)}
      className="text-sm font-semibold text-slate-800 hover:text-brand-600 transition-colors truncate text-left"
    >
      {name || entityId}
    </button>
  );
}

// ─── Graph Tab ───────────────────────────────────────────────────────────────

function GraphTab({ urn, onEntityClick }: { urn: string; onEntityClick: EntityClickHandler }) {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(true);
  const graphRef = React.useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any

  useEffect(() => {
    setLoading(true);
    fetch(`/api/graph/neighbors/school/${urn}?depth=${depth}`)
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
  }, [urn, depth]);

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
        <div className="w-5 h-5 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Depth selector */}
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
        <div className="bg-white border border-gray-200/80 rounded-2xl overflow-hidden shadow-sm">
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
        <div className="bg-white border border-gray-200/80 rounded-2xl p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">No graph data available.</p>
        </div>
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

// ─── Utility Components ──────────────────────────────────────────────────────

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

function OfstedBadge({ rating }: { rating: string }) {
  const colors: Record<string, string> = {
    Outstanding: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Good: "bg-blue-50 text-blue-700 border-blue-200",
    "Requires Improvement": "bg-amber-50 text-amber-700 border-amber-200",
    Inadequate: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${colors[rating] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
      {rating}
    </span>
  );
}

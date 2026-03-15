"use client";

import React, { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import EntitySearchSelect from "../components/entity-search";
import RadarChart from "../components/radar-chart";
import MatchExplanationPanel from "../components/match-explanation";
import ScoreWaterfall from "../components/score-waterfall";
import GraphBridge from "../components/graph-bridge";
import MatchDNA from "../components/match-dna";
import WeightTuner, { DEFAULT_HYBRID, DEFAULT_DIMENSIONS, type HybridWeights, type DimensionWeights } from "../components/weight-tuner";
import PeerContext from "../components/peer-context";

interface Recommendation {
  entity_id: string;
  entity_type: string;
  entity_name: string;
  match_score: number;
  structured_score: number;
  embedding_score: number;
  graph_score: number;
  structured_breakdown: Record<string, number>;
  structured_fields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  profile_text: string;
  shared_nodes?: string[];
}

export default function MatchPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            Loading...
          </div>
        </div>
      }
    >
      <MatchPage />
    </Suspense>
  );
}

function MatchPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "school";
  const initialId = searchParams.get("id") || "";

  const [sourceType, setSourceType] = useState(initialType);
  const [sourceId, setSourceId] = useState(initialId);
  const [sourceName, setSourceName] = useState("");
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [explainTarget, setExplainTarget] = useState<{
    schoolId: string;
    productId: string;
    schoolName: string;
    productName: string;
  } | null>(null);
  const [sourceFields, setSourceFields] = useState<Record<string, any>>({}); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [hybridWeights, setHybridWeights] = useState<HybridWeights>({ ...DEFAULT_HYBRID });
  const [dimensionWeights, setDimensionWeights] = useState<DimensionWeights>({ ...DEFAULT_DIMENSIONS });

  // Fetch source name if we have initial ID
  useEffect(() => {
    if (initialId && initialType) {
      fetch(`/api/profiles/${initialType}/${initialId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.profile) {
            setSourceName(data.profile.entity_name);
            setSourceFields(data.profile.structured_fields || {});
          }
        })
        .catch(() => {});
    }
  }, [initialType, initialId]);

  const loadRecommendations = useCallback(async () => {
    if (!sourceId) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/match/recommend?type=${sourceType}&id=${sourceId}&top=10`
      );
      const data = await res.json();
      setRecommendations(data.recommendations || []);
    } catch {
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [sourceType, sourceId]);

  useEffect(() => {
    if (initialId) loadRecommendations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const targetType = sourceType === "school" ? "product" : "school";

  // Client-side re-ranking with custom weights
  const rankedRecs = useMemo(() => {
    return recommendations
      .map((r) => {
        const bd = r.structured_breakdown || {};
        const newStructured = Object.entries(dimensionWeights).reduce(
          (sum, [key, w]) => sum + (bd[key] ?? 0) * w, 0
        );
        const newFinal =
          hybridWeights.structured * newStructured +
          hybridWeights.embedding * r.embedding_score +
          hybridWeights.graph * r.graph_score;
        return { ...r, custom_score: Math.round(newFinal * 10000) / 10000 };
      })
      .sort((a, b) => b.custom_score - a.custom_score);
  }, [recommendations, hybridWeights, dimensionWeights]);

  const filteredRecs = rankedRecs.filter(
    (r) => Math.round(r.custom_score * 100) >= minScore
  );

  const exportCSV = useCallback(() => {
    const headers = ["Rank", "Name", "Type", "Match Score", "Structured", "Embedding", "Graph"];
    const rows = filteredRecs.map((r, i) => [
      i + 1,
      r.entity_name,
      r.entity_type,
      Math.round(r.match_score * 100),
      Math.round(r.structured_score * 100),
      Math.round(r.embedding_score * 100),
      Math.round(r.graph_score * 100),
    ]);
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recommendations-${sourceType}-${sourceId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredRecs, sourceType, sourceId]);

  const handleExplain = useCallback((rec: Recommendation) => {
    const schoolId = sourceType === "school" ? sourceId : rec.entity_id;
    const productId = sourceType === "school" ? rec.entity_id : sourceId;
    const schoolName = sourceType === "school" ? sourceName : rec.entity_name;
    const productName = sourceType === "school" ? rec.entity_name : sourceName;
    setExplainTarget({ schoolId, productId, schoolName, productName });
  }, [sourceType, sourceId, sourceName]);

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center shadow-lg">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">
              Smart Recommendations
            </h1>
            <p className="text-slate-500 text-sm">
              AI-powered cross-type matching between schools and products
            </p>
          </div>
        </div>
        {recommendations.length > 0 && (
          <span className="text-xs text-slate-400 px-2 py-1 bg-slate-100 rounded-md">
            {recommendations.length} matches found
          </span>
        )}
      </div>

      {/* Controls */}
      <div className="glass-card p-5 mb-6 overflow-visible relative z-20 animate-fade-in-up" style={{ animationDelay: "0.05s", animationFillMode: "both" }}>
        {/* Direction toggle */}
        <div className="flex gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-4">
          <button
            onClick={() => {
              setSourceType("school");
              setSourceId("");
              setSourceName("");
              setRecommendations([]);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${sourceType === "school" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
            </svg>
            School → Products
          </button>
          <button
            onClick={() => {
              setSourceType("product");
              setSourceId("");
              setSourceName("");
              setRecommendations([]);
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${sourceType === "product" ? "bg-white text-brand-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
            Product → Schools
          </button>
        </div>

        {/* Search */}
        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">
              Select {sourceType === "school" ? "a school" : "a product"} to get recommendations
            </label>
            <EntitySearchSelect
              entityType={sourceType}
              onSelect={(id, name) => {
                setSourceId(id);
                setSourceName(name);
                fetch(`/api/profiles/${sourceType}/${id}`)
                  .then((r) => r.json())
                  .then((data) => { if (data.profile) setSourceFields(data.profile.structured_fields || {}); })
                  .catch(() => {});
              }}
              placeholder={`Search ${sourceType}s by name...`}
              selectedId={sourceId}
              selectedName={sourceName}
              onClear={() => {
                setSourceId("");
                setSourceName("");
                setRecommendations([]);
              }}
            />
          </div>
          <button
            onClick={loadRecommendations}
            disabled={loading || !sourceId}
            className="px-6 py-2.5 bg-gradient-to-r from-rose-500 to-orange-500 text-white rounded-xl text-sm font-bold hover:shadow-lg disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Finding...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Find Matches
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters & Export */}
      {recommendations.length > 0 && (
        <div className="glass-card p-4 mb-4 flex flex-wrap items-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.08s", animationFillMode: "both" }}>
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <label className="text-[11px] text-slate-500 font-medium whitespace-nowrap">
              Min Score
            </label>
            <input
              type="range"
              min={0}
              max={100}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-brand-500"
            />
            <span className="text-xs font-bold text-slate-700 tabular-nums w-8 text-right">
              {minScore}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400">
              {filteredRecs.length} of {recommendations.length} shown
            </span>
            <button
              onClick={exportCSV}
              className="text-[11px] font-semibold text-brand-500 hover:text-brand-700 transition-colors flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      )}

      {/* Weight Tuner */}
      {recommendations.length > 0 && (
        <div className="mb-4 animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <WeightTuner
            hybridWeights={hybridWeights}
            dimensionWeights={dimensionWeights}
            onHybridChange={setHybridWeights}
            onDimensionChange={setDimensionWeights}
            onReset={() => {
              setHybridWeights({ ...DEFAULT_HYBRID });
              setDimensionWeights({ ...DEFAULT_DIMENSIONS });
            }}
          />
        </div>
      )}

      {/* Results */}
      {filteredRecs.length === 0 && !loading ? (
        <div className="glass-card p-12 text-center animate-fade-in-up" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-rose-50 to-orange-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1">
            Find the perfect match
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Select a {sourceType} above and click &quot;Find Matches&quot; to discover the best {targetType} recommendations using our hybrid matching engine.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecs.map((rec, i) => (
            <RecommendationCard
              key={rec.entity_id}
              rec={rec}
              rank={i + 1}
              sourceType={sourceType}
              sourceName={sourceName}
              sourceId={sourceId}
              sourceFields={sourceFields}
              onExplain={() => handleExplain(rec)}
            />
          ))}
        </div>
      )}

      {/* Peer Context */}
      {recommendations.length > 0 && sourceType === "school" && sourceId && (
        <div className="mt-6 animate-fade-in-up" style={{ animationDelay: "0.3s", animationFillMode: "both" }}>
          <PeerContext
            schoolId={sourceId}
            matchedProductIds={recommendations.map((r) => r.entity_id)}
          />
        </div>
      )}

      {/* Explanation panel */}
      {explainTarget && (
        <MatchExplanationPanel
          schoolId={explainTarget.schoolId}
          productId={explainTarget.productId}
          schoolName={explainTarget.schoolName}
          productName={explainTarget.productName}
          onClose={() => setExplainTarget(null)}
        />
      )}
    </div>
  );
}

const RecommendationCard = React.memo(function RecommendationCard({
  rec,
  rank,
  sourceType,
  sourceName,
  sourceId,
  sourceFields,
  onExplain,
}: {
  rec: Recommendation & { custom_score?: number };
  rank: number;
  sourceType: string;
  sourceName: string;
  sourceId: string;
  sourceFields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onExplain: () => void;
}) {
  const [showDNA, setShowDNA] = useState(false);
  const score = Math.round((rec.custom_score ?? rec.match_score) * 100);
  const scoreColor =
    score >= 60 ? "text-emerald-500" : score >= 40 ? "text-amber-500" : "text-red-400";
  const ringColor =
    score >= 60 ? "stroke-emerald-500" : score >= 40 ? "stroke-amber-500" : "stroke-red-400";

  const bd = rec.structured_breakdown || {};
  const radarDimensions = sourceType === "school"
    ? [
        { label: "Age Fit", value: bd.phase_age_alignment || 0 },
        { label: "Subjects", value: bd.subject_overlap || 0 },
        { label: "Budget", value: bd.budget_fit || 0 },
        { label: "Pedagogy", value: bd.pedagogy_fit || 0 },
        { label: "SEND", value: bd.send_alignment || 0 },
      ]
    : [
        { label: "Age Fit", value: bd.phase_age_alignment || 0 },
        { label: "Subjects", value: bd.subject_overlap || 0 },
        { label: "Budget", value: bd.budget_fit || 0 },
        { label: "Pedagogy", value: bd.pedagogy_fit || 0 },
        { label: "SEND", value: bd.send_alignment || 0 },
      ];

  const sf = rec.structured_fields || {};
  const detailHref = rec.entity_type === "product" ? `/products/${rec.entity_id}` : `/schools/${rec.entity_id}`;

  // Confidence: how many scoring signals have meaningful data
  const signals = [
    rec.structured_score > 0,
    rec.embedding_score > 0,
    rec.graph_score > 0,
  ].filter(Boolean).length;
  const confidenceLabel = signals === 3 ? "High" : signals === 2 ? "Medium" : "Low";
  const confidenceColor = signals === 3 ? "text-emerald-500 bg-emerald-50 border-emerald-100" : signals === 2 ? "text-amber-500 bg-amber-50 border-amber-100" : "text-red-400 bg-red-50 border-red-100";

  return (
    <div
      className="glass-card p-5 group hover:border-brand-200/50 transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${rank * 0.06}s`, animationFillMode: "both" }}
    >
      <div className="flex gap-5">
        {/* Score ring */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <div className="relative">
            <svg className="w-16 h-16" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
              <circle
                cx="18" cy="18" r="15.5" fill="none"
                className={ringColor}
                strokeWidth="2.5"
                strokeDasharray={`${score * 0.975} 100`}
                strokeLinecap="round"
                transform="rotate(-90 18 18)"
              />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center text-sm font-extrabold ${scoreColor}`}>
              {score}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">#{rank}</span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={detailHref}
              className="text-base font-bold text-slate-800 hover:text-brand-600 transition-colors truncate"
            >
              {rec.entity_name}
            </Link>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${rec.entity_type === "product" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>
              {rec.entity_type}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${confidenceColor}`}>
              {confidenceLabel} confidence
            </span>
          </div>

          {/* Key fields */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {rec.entity_type === "product" ? (
              <>
                {sf.primary_category && (
                  <span className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-100">
                    {sf.primary_category}
                  </span>
                )}
                {(sf.subjects || []).slice(0, 3).map((s: string) => (
                  <span key={s} className="text-[10px] px-2 py-0.5 bg-purple-50 text-purple-600 rounded-md border border-purple-100">
                    {s}
                  </span>
                ))}
                {sf.purchase_model && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md border border-amber-100">
                    {sf.purchase_model}
                  </span>
                )}
              </>
            ) : (
              <>
                {sf.phase && (
                  <span className="text-[10px] px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md border border-slate-100">
                    {sf.phase}
                  </span>
                )}
                {sf.region && (
                  <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md border border-blue-100">
                    {sf.region}
                  </span>
                )}
                {sf.ofsted_rating && (
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md border border-emerald-100">
                    {sf.ofsted_rating}
                  </span>
                )}
              </>
            )}
          </div>

          {/* Score breakdown bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden gap-px bg-slate-100 mb-1">
            <div
              className="bg-blue-400 rounded-l-full transition-all duration-700"
              style={{
                width: `${(rec.structured_score / Math.max(rec.structured_score + rec.embedding_score + rec.graph_score, 0.01)) * 100}%`,
              }}
              title={`Structured: ${Math.round(rec.structured_score * 100)}%`}
            />
            <div
              className="bg-emerald-400 transition-all duration-700"
              style={{
                width: `${(rec.embedding_score / Math.max(rec.structured_score + rec.embedding_score + rec.graph_score, 0.01)) * 100}%`,
              }}
              title={`Embedding: ${Math.round(rec.embedding_score * 100)}%`}
            />
            <div
              className="bg-purple-400 rounded-r-full transition-all duration-700"
              style={{
                width: `${(rec.graph_score / Math.max(rec.structured_score + rec.embedding_score + rec.graph_score, 0.01)) * 100}%`,
              }}
              title={`Graph: ${Math.round(rec.graph_score * 100)}%`}
            />
          </div>
          <div className="flex gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" />
              Structured {Math.round(rec.structured_score * 100)}%
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" />
              Embedding {Math.round(rec.embedding_score * 100)}%
            </span>
            <span className="flex items-center gap-0.5">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full inline-block" />
              Graph {Math.round(rec.graph_score * 100)}%
            </span>
          </div>

          {/* Score Waterfall */}
          <ScoreWaterfall breakdown={bd} compact />

          {/* Graph Bridge */}
          {rec.shared_nodes && rec.shared_nodes.length > 0 && (
            <GraphBridge
              schoolName={sourceType === "school" ? sourceName : rec.entity_name}
              schoolId={sourceType === "school" ? sourceId : rec.entity_id}
              productName={sourceType === "school" ? rec.entity_name : sourceName}
              productId={sourceType === "school" ? rec.entity_id : sourceId}
              sharedNodes={rec.shared_nodes}
            />
          )}

          {/* Profile snippet */}
          {rec.profile_text && (
            <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
              {rec.profile_text}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-3 pt-2 border-t border-slate-100/60">
            <button
              onClick={() => setShowDNA(!showDNA)}
              className={`text-[11px] font-semibold transition-colors flex items-center gap-1 ${showDNA ? "text-brand-600" : "text-brand-400 hover:text-brand-600"}`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
              </svg>
              {showDNA ? "Hide" : "Show"} Match DNA
            </button>
            <button
              onClick={onExplain}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-700 transition-colors flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              Explain Match
            </button>
            <Link
              href={detailHref}
              className="text-[11px] font-semibold text-brand-500 hover:text-brand-700 transition-colors"
            >
              View Profile
            </Link>
            <Link
              href={`/graph?type=${rec.entity_type}&id=${rec.entity_id}`}
              className="text-[11px] font-semibold text-purple-500 hover:text-purple-700 transition-colors"
            >
              Graph
            </Link>
          </div>
        </div>

        {/* Radar chart */}
        <div className="flex-shrink-0">
          <div className="hidden lg:block">
            <RadarChart
              dimensions={radarDimensions}
              size={140}
              color={score >= 60 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171"}
            />
          </div>
          <div className="lg:hidden">
            <RadarChart
              dimensions={radarDimensions}
              size={90}
              color={score >= 60 ? "#34d399" : score >= 40 ? "#fbbf24" : "#f87171"}
              showLabels={false}
            />
          </div>
        </div>
      </div>

      {/* Expandable Match DNA */}
      <AnimatePresence>
        {showDNA && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden border-t border-slate-100 mt-4"
          >
            <MatchDNA
              schoolFields={sourceType === "school" ? sourceFields : rec.structured_fields}
              productFields={sourceType === "school" ? rec.structured_fields : sourceFields}
              breakdown={bd}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

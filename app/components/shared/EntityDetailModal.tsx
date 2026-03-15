// @ts-nocheck
"use client";

import React, { useState, useEffect, useCallback } from "react";

interface EntityDetailModalProps {
  entityType: "school" | "product";
  entityId: string;
  onClose: () => void;
  onNavigate?: (type: "school" | "product", id: string) => void;
}

interface ProfileData {
  entity_name: string;
  entity_id: string;
  entity_type: string;
  structured_fields: Record<string, any>;
  profile_text: string;
  schema_version: string;
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

export function EntityDetailModal({ entityType, entityId, onClose, onNavigate }: EntityDetailModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [similar, setSimilar] = useState<SimilarEntity[]>([]);
  const [similarLoading, setSimilarLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    setProfile(null);
    fetch(`/api/profiles/${entityType}/${entityId}`)
      .then((r) => r.json())
      .then((data) => setProfile(data.profile || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    setSimilarLoading(true);
    setSimilar([]);
    fetch(`/api/similar/${entityType}/${entityId}?top=6`)
      .then((r) => r.json())
      .then((data) => setSimilar(data.similar || []))
      .catch(() => setSimilar([]))
      .finally(() => setSimilarLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleEntityClick = useCallback((type: "school" | "product", id: string) => {
    if (onNavigate) onNavigate(type, id);
  }, [onNavigate]);

  const sf = profile?.structured_fields || {};
  const isSchool = entityType === "school";
  const accentFrom = isSchool ? "from-blue-500" : "from-indigo-500";
  const accentTo = isSchool ? "to-blue-600" : "to-indigo-600";
  const accentColor = isSchool ? "#3b82f6" : "#6366f1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className="relative w-full max-w-[900px] max-h-[90vh] bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Hero header ── */}
        <div className="relative shrink-0 overflow-hidden">
          {/* Gradient bg */}
          <div className={`absolute inset-0 bg-gradient-to-br ${accentFrom} ${accentTo} opacity-[0.06]`} />
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-10" style={{ background: `radial-gradient(circle, ${accentColor}, transparent)`, transform: "translate(30%, -50%)" }} />

          <div className="relative px-8 pt-6 pb-5">
            {/* Close button */}
            <button onClick={onClose} className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-white/80 hover:bg-white flex items-center justify-center transition-all shadow-sm hover:shadow group">
              <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {loading ? (
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-200" />
                <div>
                  <div className="h-6 bg-slate-200 rounded w-48 mb-2" />
                  <div className="h-4 bg-slate-100 rounded w-32" />
                </div>
              </div>
            ) : profile ? (
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${accentFrom} ${accentTo} flex items-center justify-center text-white font-bold text-2xl shadow-lg shrink-0`}
                  style={{ boxShadow: `0 8px 24px ${accentColor}30` }}
                >
                  {profile.entity_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <h2 className="text-xl font-extrabold text-slate-800 truncate pr-10">{profile.entity_name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-medium">{entityType} &middot; {entityId}</span>
                    {isSchool ? (
                      <>
                        {sf.phase && <Badge value={sf.phase} color="bg-blue-100/80 text-blue-700" />}
                        {sf.type && <Badge value={sf.type} color="bg-purple-100/80 text-purple-700" />}
                        {sf.ofsted_rating && <Badge value={sf.ofsted_rating} color={
                          sf.ofsted_rating === "Outstanding" ? "bg-emerald-100/80 text-emerald-700" :
                          sf.ofsted_rating === "Good" ? "bg-blue-100/80 text-blue-700" :
                          "bg-amber-100/80 text-amber-700"
                        } />}
                        {sf.region && <Badge value={sf.region} color="bg-slate-100/80 text-slate-600" />}
                      </>
                    ) : (
                      <>
                        {sf.pedagogy_style && <Badge value={sf.pedagogy_style} color="bg-violet-100/80 text-violet-700" />}
                        {sf.send_suitability && <Badge value={sf.send_suitability} color="bg-teal-100/80 text-teal-700" />}
                        {Array.isArray(sf.target_school_type) && <Badge value={`${sf.target_school_type.length} school types`} color="bg-slate-100/80 text-slate-600" />}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-sm">Profile not found</p>
            )}
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="px-8 py-8 space-y-6 animate-pulse">
              <div className="h-3 bg-slate-100 rounded w-full" />
              <div className="h-3 bg-slate-100 rounded w-5/6" />
              <div className="h-3 bg-slate-100 rounded w-4/6" />
            </div>
          ) : !profile ? null : (
            <div className="px-8 py-6 space-y-7">

              {/* ── Overview ── */}
              {(sf.value_proposition || sf.school_character || profile.profile_text) && (
                <div>
                  <SectionHeader icon="overview" label="Overview" />
                  <p className="text-[13px] text-slate-600 leading-relaxed">
                    {String(sf.value_proposition || sf.school_character || profile.profile_text).slice(0, 500)}
                    {String(sf.value_proposition || sf.school_character || profile.profile_text).length > 500 ? "..." : ""}
                  </p>
                </div>
              )}

              {/* ── Key info row ── */}
              <div className="flex flex-wrap gap-6">
                {isSchool && sf.likely_tech_needs && Array.isArray(sf.likely_tech_needs) && sf.likely_tech_needs.length > 0 && (
                  <div className="flex-1 min-w-[200px]">
                    <SectionHeader icon="tech" label="Technology Needs" />
                    <div className="flex flex-wrap gap-1.5">
                      {sf.likely_tech_needs.map((need: string) => (
                        <span key={need} className="px-2.5 py-1 rounded-lg bg-brand-50 text-xs font-medium text-brand-700">{need}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!isSchool && sf.competitive_positioning && (
                  <div className="flex-1 min-w-[200px]">
                    <SectionHeader icon="market" label="Market Positioning" />
                    <p className="text-xs text-slate-500 leading-relaxed">{sf.competitive_positioning}</p>
                  </div>
                )}
                {isSchool && sf.deprivation_level && (
                  <div>
                    <SectionHeader icon="info" label="Deprivation" />
                    <span className="text-xs text-slate-600 font-medium capitalize">{sf.deprivation_level}</span>
                  </div>
                )}
                {isSchool && sf.size_band && (
                  <div>
                    <SectionHeader icon="info" label="Size" />
                    <span className="text-xs text-slate-600 font-medium">{sf.size_band}</span>
                  </div>
                )}
              </div>

              {/* ── All Fields (collapsed) ── */}
              <FieldsSection sf={sf} />

              {/* ── Similar Entities ── */}
              <div>
                <SectionHeader icon="similar" label={isSchool ? "Similar Schools" : "Similar Products"} />
                {similarLoading ? <LoadingPlaceholder /> : similar.length === 0 ? (
                  <EmptyState text="No similarity data yet" />
                ) : (
                  <div className="space-y-3">
                    {similar.map((item, i) => (
                      <SimilarCard
                        key={item.entity_id}
                        item={item}
                        rank={i + 1}
                        sourceName={profile.entity_name}
                        sourceSf={sf}
                        isSchool={isSchool}
                        onClick={() => handleEntityClick(entityType, item.entity_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set(["the","a","an","and","or","but","in","on","at","to","for","of","with","by","from","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","shall","should","may","might","can","could","it","its","that","this","these","those","their","them","they","he","she","we","you","i","not","no","all","each","every","both","few","more","most","other","some","such","than","too","very","also","as","if","so","about","up","out","into","through","during","before","after","above","below","between","same","which","what","who","whom","where","when","how","any","just","only","then","here","there","now","make","making","made","provide","provides","help","helps","school","schools","product","offering","offers","approach","based","learning","education","educational","support","features","including","range","tool","tools","well","using","used"]);

function extractWords(text: string): string[] {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP_WORDS.has(w));
}

function highlightSharedWords(text: string, sharedSet: Set<string>): React.ReactNode[] {
  // Split text into words while preserving whitespace and punctuation
  const tokens = text.split(/(\s+)/);
  return tokens.map((token, i) => {
    const clean = token.toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (clean.length > 3 && sharedSet.has(clean)) {
      return <mark key={i} className="bg-emerald-100 text-emerald-800 rounded px-0.5 font-semibold">{token}</mark>;
    }
    return <span key={i}>{token}</span>;
  });
}

// ─── Similar Card ────────────────────────────────────────────────────────────

function SimilarCard({ item, rank, sourceName, sourceSf, isSchool, onClick }: {
  item: SimilarEntity; rank: number; sourceName: string; sourceSf: Record<string, any>; isSchool: boolean; onClick: () => void;
}) {
  const score = Math.round(item.similarity_score * 100);
  const isf = item.structured_fields || {};

  // Build field-by-field comparisons
  const comparisons: { label: string; source: string; target: string; match: boolean }[] = [];
  const compareFields = isSchool
    ? [
        { key: "phase", label: "Phase" },
        { key: "type", label: "Type" },
        { key: "region", label: "Region" },
        { key: "ofsted_rating", label: "Ofsted" },
        { key: "size_band", label: "Size" },
        { key: "deprivation_level", label: "Deprivation" },
      ]
    : [
        { key: "pedagogy_style", label: "Pedagogy" },
        { key: "send_suitability", label: "SEND" },
      ];

  for (const f of compareFields) {
    const sv = sourceSf[f.key]; const tv = isf[f.key];
    if (sv || tv) comparisons.push({ label: f.label, source: sv || "—", target: tv || "—", match: !!(sv && tv && sv === tv) });
  }

  // School type / tech needs overlap analysis
  let overlapItems: string[] = [];
  let sourceOnly: string[] = [];
  let targetOnly: string[] = [];
  const listKey = isSchool ? "likely_tech_needs" : "target_school_type";
  const listLabel = isSchool ? "Tech Needs" : "School Types";
  if (Array.isArray(sourceSf[listKey]) && Array.isArray(isf[listKey])) {
    const sSet = new Set(sourceSf[listKey] as string[]);
    const tSet = new Set(isf[listKey] as string[]);
    overlapItems = [...sSet].filter((x) => tSet.has(x));
    sourceOnly = [...sSet].filter((x) => !tSet.has(x));
    targetOnly = [...tSet].filter((x) => !sSet.has(x));
  }

  const matchCount = comparisons.filter((c) => c.match).length;
  const totalComp = comparisons.length;
  const listOverlapPct = (overlapItems.length + sourceOnly.length + targetOnly.length) > 0
    ? overlapItems.length / (overlapItems.length + sourceOnly.length + targetOnly.length)
    : 0;

  // Value proposition / description
  const sourceDesc = sourceSf.value_proposition || sourceSf.school_character || "";
  const targetDesc = isf.value_proposition || isf.school_character || "";
  const sourcePos = String(sourceSf.competitive_positioning || "");
  const targetPos = String(isf.competitive_positioning || "");

  // Shared words for highlighting
  const allSourceText = sourceDesc + " " + sourcePos;
  const allTargetText = targetDesc + " " + targetPos;
  const srcWords = extractWords(allSourceText);
  const tgtWords = extractWords(allTargetText);
  const sharedWordSet = new Set(srcWords.filter((w) => new Set(tgtWords).has(w)));
  const sharedWordCount = sharedWordSet.size;
  const totalUniqueWords = new Set([...srcWords, ...tgtWords]).size;
  const textOverlapPct = totalUniqueWords > 0 ? sharedWordCount / totalUniqueWords : 0;

  // Radar dimensions
  const radarDims = isSchool
    ? [
        { label: "Phase", value: comparisons.find((c) => c.label === "Phase")?.match ? 1 : 0 },
        { label: "Type", value: comparisons.find((c) => c.label === "Type")?.match ? 1 : 0 },
        { label: "Region", value: comparisons.find((c) => c.label === "Region")?.match ? 1 : 0 },
        { label: "Ofsted", value: comparisons.find((c) => c.label === "Ofsted")?.match ? 1 : 0 },
        { label: "Text", value: item.embedding_score },
        { label: "Structure", value: item.structured_score },
      ]
    : [
        { label: "Pedagogy", value: comparisons.find((c) => c.label === "Pedagogy")?.match ? 1 : 0 },
        { label: "SEND", value: comparisons.find((c) => c.label === "SEND")?.match ? 1 : 0 },
        { label: "Audience", value: listOverlapPct },
        { label: "Text", value: item.embedding_score },
        { label: "Keywords", value: textOverlapPct },
        { label: "Structure", value: item.structured_score },
      ];

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden hover:border-brand-200 hover:shadow-md transition-all">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 bg-slate-50/80 border-b border-slate-100">
        <span className="w-6 h-6 rounded-lg bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{rank}</span>
        <button onClick={onClick} className="text-sm font-semibold text-slate-700 hover:text-brand-600 truncate text-left transition-colors flex-1">
          {item.entity_name}
        </button>
        <ScorePill score={score} />
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* ── 1. Radar + Score breakdown side by side ── */}
        <div className="flex items-start gap-4">
          {/* Radar chart */}
          <div className="shrink-0">
            <SimilarityRadar dims={radarDims} size={150} />
          </div>
          <div className="flex-1 min-w-0 space-y-2.5">
            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">Similarity Breakdown</div>
            <MiniBar label="Structured" value={item.structured_score} color="bg-blue-400" />
            <MiniBar label="Embedding" value={item.embedding_score} color="bg-emerald-400" />
            <MiniBar label="Graph" value={item.graph_score || 0} color="bg-purple-400" />
            <div className="pt-1 border-t border-slate-100 flex items-center gap-3 text-[10px]">
              <span className="text-slate-400">Fields matched:</span>
              <span className="font-bold text-slate-600">{matchCount}/{totalComp}</span>
              {(overlapItems.length + sourceOnly.length + targetOnly.length) > 0 && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-slate-400">{listLabel} overlap:</span>
                  <span className="font-bold text-slate-600">{overlapItems.length}/{overlapItems.length + sourceOnly.length + targetOnly.length}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. Highlighted description comparison ── */}
        {(sourceDesc || targetDesc) && (
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-2">
              Description Comparison
              {sharedWordCount > 0 && <span className="ml-2 text-emerald-500 normal-case">{sharedWordCount} shared concepts highlighted</span>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-blue-50/30 rounded-xl p-3 border border-blue-100/40">
                <div className="text-[9px] text-blue-500 font-semibold mb-1.5">{sourceName}</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{highlightSharedWords(sourceDesc, sharedWordSet)}</p>
              </div>
              <div className="bg-purple-50/30 rounded-xl p-3 border border-purple-100/40">
                <div className="text-[9px] text-purple-500 font-semibold mb-1.5">{item.entity_name}</div>
                <p className="text-[11px] text-slate-500 leading-relaxed">{highlightSharedWords(targetDesc, sharedWordSet)}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 3. Attribute comparison table ── */}
        <div className="bg-slate-50/60 rounded-xl px-3 py-2">
          <div className="grid grid-cols-[90px_1fr_20px_1fr] gap-x-2 text-[11px]">
            {comparisons.map((c) => (
              <React.Fragment key={c.label}>
                <div className="text-slate-400 py-1.5 border-b border-white/60 font-medium">{c.label}</div>
                <div className={`py-1.5 border-b border-white/60 font-medium truncate ${c.match ? "text-slate-700" : "text-slate-400"}`}>{c.source}</div>
                <div className="py-1.5 border-b border-white/60 flex items-center justify-center">
                  {c.match ? (
                    <div className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-rose-50 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className={`py-1.5 border-b border-white/60 font-medium truncate ${c.match ? "text-slate-700" : "text-slate-400"}`}>{c.target}</div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── 4. Audience/list overlap visualization ── */}
        {(overlapItems.length > 0 || sourceOnly.length > 0 || targetOnly.length > 0) && (
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-2">{listLabel} Overlap</div>
            {/* Proportional overlap bar */}
            <div className="flex h-5 rounded-full overflow-hidden mb-2">
              {sourceOnly.length > 0 && (
                <div className="bg-blue-200 flex items-center justify-center" style={{ flex: sourceOnly.length }}>
                  <span className="text-[8px] text-blue-700 font-bold">{sourceOnly.length}</span>
                </div>
              )}
              {overlapItems.length > 0 && (
                <div className="bg-emerald-300 flex items-center justify-center" style={{ flex: overlapItems.length }}>
                  <span className="text-[8px] text-emerald-800 font-bold">{overlapItems.length} shared</span>
                </div>
              )}
              {targetOnly.length > 0 && (
                <div className="bg-purple-200 flex items-center justify-center" style={{ flex: targetOnly.length }}>
                  <span className="text-[8px] text-purple-700 font-bold">{targetOnly.length}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              {overlapItems.map((t) => (
                <span key={t} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">{t}</span>
              ))}
              {sourceOnly.map((t) => (
                <span key={`s-${t}`} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-blue-50 text-blue-400 ring-1 ring-blue-200">{t}</span>
              ))}
              {targetOnly.map((t) => (
                <span key={`t-${t}`} className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-purple-50 text-purple-400 ring-1 ring-purple-200">{t}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── 5. Market positioning comparison ── */}
        {(sourcePos || targetPos) && (
          <div>
            <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Market Positioning</div>
            <div className="grid grid-cols-2 gap-3">
              <p className="text-[10px] text-slate-500 leading-relaxed bg-blue-50/30 rounded-lg p-2.5 border border-blue-100/40">
                {highlightSharedWords(sourcePos.slice(0, 200) + (sourcePos.length > 200 ? "…" : ""), sharedWordSet)}
              </p>
              <p className="text-[10px] text-slate-500 leading-relaxed bg-purple-50/30 rounded-lg p-2.5 border border-purple-100/40">
                {highlightSharedWords(targetPos.slice(0, 200) + (targetPos.length > 200 ? "…" : ""), sharedWordSet)}
              </p>
            </div>
          </div>
        )}

        {/* ── 6. AI Inline Analysis ── */}
        <InlineAIAnalysis sourceName={sourceName} targetName={item.entity_name} score={score} />
      </div>
    </div>
  );
}

// ─── Similarity Radar ────────────────────────────────────────────────────────

function SimilarityRadar({ dims, size }: { dims: { label: string; value: number }[]; size: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 28;
  const n = dims.length;

  const pointAt = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r * val, y: cy + Math.sin(angle) * r * val };
  };

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const polygon = dims.map((d, i) => pointAt(i, d.value));
  const polyStr = polygon.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Grid */}
      {gridLevels.map((lvl) => (
        <polygon
          key={lvl}
          points={dims.map((_, i) => { const p = pointAt(i, lvl); return `${p.x},${p.y}`; }).join(" ")}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={0.5}
        />
      ))}
      {/* Axes */}
      {dims.map((_, i) => {
        const p = pointAt(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth={0.5} />;
      })}
      {/* Fill */}
      <polygon points={polyStr} fill="#10b981" fillOpacity={0.15} stroke="#10b981" strokeWidth={1.5} strokeOpacity={0.6} />
      {/* Dots */}
      {polygon.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={dims[i].value > 0.5 ? "#10b981" : dims[i].value > 0 ? "#f59e0b" : "#e2e8f0"} />
      ))}
      {/* Labels */}
      {dims.map((d, i) => {
        const p = pointAt(i, 1.22);
        return (
          <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" fontSize={7.5} fontWeight={500} fill={d.value > 0.5 ? "#065f46" : "#94a3b8"}>
            {d.label}
          </text>
        );
      })}
    </svg>
  );
}

// ─── Inline AI Analysis ──────────────────────────────────────────────────────

function InlineAIAnalysis({ sourceName, targetName, score }: { sourceName: string; targetName: string; score: number }) {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = useCallback(() => {
    setLoading(true);
    const query = `Compare "${sourceName}" and "${targetName}" (${score}% similar). In 3-4 concise bullet points: what do they share, how do they differ, and which type of school suits each better?`;

    // Always open the advisor for a richer experience
    window.dispatchEvent(new CustomEvent("open-advisor", {
      detail: { query },
    }));
    setLoading(false);
  }, [sourceName, targetName, score]);

  return (
    <button
      onClick={runAnalysis}
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 hover:from-brand-100 hover:to-purple-100 border border-brand-200/30 text-[11px] font-semibold text-brand-600 transition-all disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
      Deep dive with AI — compare in detail
    </button>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Badge({ value, color }: { value: string; color: string }) {
  return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>{value}</span>;
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 50
    ? "text-emerald-700 bg-emerald-50 ring-emerald-200"
    : score >= 30
    ? "text-amber-700 bg-amber-50 ring-amber-200"
    : "text-slate-500 bg-slate-50 ring-slate-200";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ring-1 shrink-0 tabular-nums ${color}`}>
      {score}%
    </span>
  );
}

function MiniBar({ label, value, color }: { label: string; value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-1.5 flex-1">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${color}`} />
      <span className="text-[9px] text-slate-400 font-medium w-14 shrink-0">{label}</span>
      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[9px] text-slate-400 tabular-nums w-6 text-right">{pct}%</span>
    </div>
  );
}

function SectionHeader({ icon, label }: { icon: string; label: string }) {
  const colors: Record<string, string> = {
    overview: "bg-brand-400",
    tech: "bg-emerald-400",
    market: "bg-violet-400",
    info: "bg-slate-400",
    similar: "bg-blue-400",
    rec: "bg-purple-400",
  };
  return (
    <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
      <div className={`w-1.5 h-1.5 rounded-full ${colors[icon] || "bg-slate-400"}`} />
      {label}
    </h3>
  );
}

function LoadingPlaceholder() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="bg-slate-50 rounded-xl p-3 animate-pulse">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-md bg-slate-200" />
            <div className="h-3.5 bg-slate-200 rounded w-32" />
            <div className="ml-auto h-4 w-10 bg-slate-200 rounded-full" />
          </div>
          <div className="h-2 bg-slate-100 rounded w-full" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-6">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center mx-auto mb-2">
        <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883 2.542l.857 6a2.25 2.25 0 002.227 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25 2.25 0 00-1.883-2.542m-16.5 0V6A2.25 2.25 0 016 3.75h3.879a1.5 1.5 0 011.06.44l2.122 2.12a1.5 1.5 0 001.06.44H18A2.25 2.25 0 0120.25 9v.776" />
        </svg>
      </div>
      <p className="text-[11px] text-slate-300">{text}</p>
    </div>
  );
}

function FieldsSection({ sf }: { sf: Record<string, any> }) {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(sf).filter(([key]) =>
    !["value_proposition", "school_character", "competitive_positioning", "profile_text"].includes(key)
  );
  if (entries.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
      >
        <svg className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        All Fields ({entries.length})
      </button>
      {expanded && (
        <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
          {entries.map(([key, value]) => (
            <div key={key} className="flex justify-between items-baseline text-xs py-1 border-b border-slate-50">
              <span className="text-slate-400 capitalize shrink-0 mr-3">{key.replace(/_/g, " ")}</span>
              <span className="text-slate-600 font-medium text-right truncate max-w-[250px]">
                {Array.isArray(value) ? value.join(", ") : String(value ?? "-")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

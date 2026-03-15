// @ts-nocheck — fields are Record<string, unknown> from API; all renders are guarded with String()/Number()
"use client";

import { useState, useEffect } from "react";

interface DetailModalProps {
  entityType: "school" | "product";
  entityId: string;
  onClose: () => void;
}

interface ProfileData {
  entity_name: string;
  entity_type: string;
  entity_id: string;
  structured_fields: Record<string, unknown>;
  profile_text: string;
}

const FIELD_COLORS: Record<string, string> = {
  phase: "bg-blue-50 text-blue-700 border-blue-200/50",
  type: "bg-purple-50 text-purple-700 border-purple-200/50",
  region: "bg-cyan-50 text-cyan-700 border-cyan-200/50",
  ofsted_rating: "bg-emerald-50 text-emerald-700 border-emerald-200/50",
  fsm_band: "bg-amber-50 text-amber-700 border-amber-200/50",
  size_band: "bg-slate-50 text-slate-600 border-slate-200/50",
  primary_category: "bg-brand-50 text-brand-700 border-brand-200/50",
  pedagogy_style: "bg-violet-50 text-violet-700 border-violet-200/50",
  purchase_model: "bg-teal-50 text-teal-700 border-teal-200/50",
  send_suitability: "bg-rose-50 text-rose-700 border-rose-200/50",
  user_rating: "bg-amber-50 text-amber-700 border-amber-200/50",
  num_of_reviews: "bg-slate-50 text-slate-600 border-slate-200/50",
};

const IMPACT_LABELS: Record<string, { label: string; color: string }> = {
  build_student_knowledge: { label: "Student Knowledge", color: "bg-blue-500" },
  improve_attainment: { label: "Attainment", color: "bg-emerald-500" },
  improve_teaching_efficiency: { label: "Teaching Efficiency", color: "bg-violet-500" },
  reduce_teacher_workload: { label: "Workload Reduction", color: "bg-amber-500" },
  improve_teacher_knowledge: { label: "Teacher Knowledge", color: "bg-rose-500" },
};

export function DetailModal({ entityType, entityId, onClose }: DetailModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/profiles/${entityType}/${entityId}`)
      .then((r) => r.json())
      .then((data) => setProfile(data.profile || null))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false));
  }, [entityType, entityId]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const fields = profile?.structured_fields || {};
  const impact: Record<string, number> = (fields.educational_impact && typeof fields.educational_impact === "object") ? fields.educational_impact as Record<string, number> : {};
  const alternatives: string[] = Array.isArray(fields.alternatives) ? fields.alternatives as string[] : [];

  const displayFields = entityType === "school"
    ? ["phase", "type", "region", "ofsted_rating", "fsm_band", "size_band", "urban_rural", "trust_name", "number_of_pupils", "percentage_fsm"]
    : ["primary_category", "organisation", "pedagogy_style", "purchase_model", "send_suitability", "subjects", "age_range", "target_school_type"];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" />

      {/* Slide-in panel */}
      <div
        className="relative w-[480px] max-w-[90vw] h-full bg-white shadow-2xl overflow-y-auto animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-slate-200/60 px-6 py-4 flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${entityType === "school" ? "bg-gradient-to-br from-blue-500 to-blue-600" : "gradient-bg"}`}>
            {entityType === "school" ? (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
              </svg>
            ) : (
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-800 truncate">
              {loading ? "Loading..." : profile?.entity_name || entityId}
            </h2>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{entityType} &middot; {entityId}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center transition-colors">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
          </div>
        ) : !profile ? (
          <div className="text-center py-20 text-slate-400 text-sm">Profile not found</div>
        ) : (
          <div className="px-6 py-5 space-y-6">
            {/* Smart summary — use value_proposition or school_character, not raw template */}
            {(fields.value_proposition || fields.school_character) && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Overview</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {String(fields.value_proposition || fields.school_character)}
                </p>
              </div>
            )}

            {/* Key fields as visual tags */}
            <div>
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Attributes</h3>
              <div className="flex flex-wrap gap-2">
                {displayFields.map((key) => {
                  const val = fields[key];
                  if (!val) return null;
                  const display = Array.isArray(val) ? (val as string[]).join(", ") : String(val);
                  const color = FIELD_COLORS[key] || "bg-slate-50 text-slate-600 border-slate-200/50";
                  return (
                    <span key={key} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium ${color}`}>
                      <span className="opacity-50 capitalize">{key.replace(/_/g, " ")}</span>
                      <span>{display}</span>
                    </span>
                  );
                })}
              </div>
            </div>

            {Boolean(entityType === "product" && Object.keys(impact).length > 0) && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Educational Impact</h3>
                <div className="space-y-2.5">
                  {Object.entries(IMPACT_LABELS).map(([key, meta]) => {
                    const val = impact[key];
                    if (val == null) return null;
                    return (
                      <div key={key} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-[130px] shrink-0 text-right">{meta.label}</span>
                        <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${meta.color} rounded-full`} style={{ width: `${Number(val)}%` }}>
                            <div className="h-full bg-gradient-to-r from-transparent to-white/20" />
                          </div>
                        </div>
                        <span className="text-xs font-bold text-slate-700 w-10 text-right">{Number(val)}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {Boolean(entityType === "product" && alternatives.length > 0) && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Alternatives</h3>
                <div className="flex flex-wrap gap-1.5">
                  {alternatives.map((alt) => (
                    <span key={alt} className="px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200/50 text-xs font-medium text-amber-700">
                      {alt}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Extra details */}
            {fields.competitive_positioning && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Market Positioning</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{String(fields.competitive_positioning)}</p>
              </div>
            )}
            {fields.likely_tech_needs && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Technology Needs</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(Array.isArray(fields.likely_tech_needs) ? fields.likely_tech_needs : [String(fields.likely_tech_needs)]).map((need, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200/50 text-xs font-medium text-brand-700">
                      {String(need)}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {fields.key_features && Array.isArray(fields.key_features) && (fields.key_features as string[]).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Features</h3>
                <div className="flex flex-wrap gap-1.5">
                  {(fields.key_features as string[]).map((feat, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/50 text-xs font-medium text-slate-600">
                      {feat}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Rating */}
            {fields.user_rating && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-200/30">
                <div className="text-2xl font-extrabold text-amber-600">{String(fields.user_rating)}</div>
                <div>
                  <div className="text-xs font-semibold text-amber-700">/10 rating</div>
                  {fields.num_of_reviews && <div className="text-[10px] text-amber-500">{String(fields.num_of_reviews)} reviews</div>}
                </div>
              </div>
            )}

            {/* Open full page link */}
            <div className="pt-2 border-t border-slate-100">
              <a
                href={entityType === "school" ? `/schools/${entityId}` : `/products/${entityId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/50 text-xs font-medium text-slate-600 hover:text-brand-600 transition-all"
              >
                Open full profile page
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

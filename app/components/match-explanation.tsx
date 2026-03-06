"use client";

import { useState, useEffect } from "react";
import MatchDNA from "./match-dna";
import PeerContext from "./peer-context";
import { useAWSCredentials } from "./aws-credentials-provider";

interface MatchExplanation {
  fit_score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendation: string;
}

interface ExplainData {
  explanation: MatchExplanation;
  scores?: { breakdown: Record<string, number> };
  school?: { structured_fields: Record<string, unknown> };
  product?: { structured_fields: Record<string, unknown> };
}

interface MatchExplanationPanelProps {
  schoolId: string;
  productId: string;
  schoolName: string;
  productName: string;
  onClose: () => void;
}

export default function MatchExplanationPanel({
  schoolId,
  productId,
  schoolName,
  productName,
  onClose,
}: MatchExplanationPanelProps) {
  const { getHeaders, isConfigured, setShowSettings } = useAWSCredentials();
  const [loading, setLoading] = useState(true);
  const [explanation, setExplanation] = useState<MatchExplanation | null>(null);
  const [fullData, setFullData] = useState<ExplainData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      setError("AWS Bedrock credentials required. Click the settings button to configure.");
      return;
    }
    fetch("/api/match/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getHeaders() },
      body: JSON.stringify({ school_id: schoolId, product_id: productId }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else {
          setExplanation(data.explanation);
          setFullData(data);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolId, productId, isConfigured, getHeaders]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg h-full bg-white shadow-2xl animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-10 border-b border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Match Explanation
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                AI-powered analysis
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
            >
              <svg
                className="w-4 h-4 text-slate-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Entity badges */}
          <div className="flex items-center gap-2 mt-3">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold border border-blue-100">
              {schoolName}
            </span>
            <svg
              className="w-4 h-4 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-100">
              {productName}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-16 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-24 bg-slate-100 rounded-xl" />
              <div className="h-16 bg-slate-100 rounded-xl" />
            </div>
          )}

          {error && (
            <div className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl p-4">
              {error}
            </div>
          )}

          {explanation && (
            <div className="space-y-5 animate-fade-in-up">
              {/* Fit score */}
              <div className="text-center py-4">
                <div className="relative inline-flex items-center justify-center">
                  <svg className="w-20 h-20" viewBox="0 0 36 36">
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="18"
                      cy="18"
                      r="15.5"
                      fill="none"
                      stroke={
                        explanation.fit_score >= 75
                          ? "#34d399"
                          : explanation.fit_score >= 50
                          ? "#fbbf24"
                          : "#f87171"
                      }
                      strokeWidth="2.5"
                      strokeDasharray={`${explanation.fit_score * 0.975} 100`}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                    />
                  </svg>
                  <span className="absolute text-lg font-extrabold text-slate-800">
                    {explanation.fit_score}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 font-medium">
                  Overall Fit Score
                </div>
              </div>

              {/* Summary */}
              <div className="glass-card p-4">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Summary
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {explanation.summary}
                </p>
              </div>

              {/* Strengths */}
              {explanation.strengths.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Strengths
                  </h3>
                  <div className="space-y-1.5">
                    {explanation.strengths.map((s, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-700 bg-emerald-50/50 rounded-lg px-3 py-2 border border-emerald-100/50"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Gaps */}
              {explanation.gaps.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                      />
                    </svg>
                    Gaps & Concerns
                  </h3>
                  <div className="space-y-1.5">
                    {explanation.gaps.map((g, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 text-sm text-slate-700 bg-amber-50/50 rounded-lg px-3 py-2 border border-amber-100/50"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                        {g}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              {explanation.recommendation && (
                <div className="glass-card p-4 border-l-4 border-brand-400">
                  <h3 className="text-xs font-semibold text-brand-600 uppercase tracking-wider mb-2">
                    Recommendation
                  </h3>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    {explanation.recommendation}
                  </p>
                </div>
              )}

              {/* Match DNA */}
              {fullData?.scores?.breakdown && fullData?.school?.structured_fields && fullData?.product?.structured_fields && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Match DNA
                  </h3>
                  <div className="glass-card p-3">
                    <MatchDNA
                      schoolFields={fullData.school.structured_fields as Record<string, any>} // eslint-disable-line @typescript-eslint/no-explicit-any
                      productFields={fullData.product.structured_fields as Record<string, any>} // eslint-disable-line @typescript-eslint/no-explicit-any
                      breakdown={fullData.scores.breakdown}
                    />
                  </div>
                </div>
              )}

              {/* Peer Context */}
              <PeerContext schoolId={schoolId} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

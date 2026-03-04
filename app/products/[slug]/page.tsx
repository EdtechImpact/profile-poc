"use client";

import Link from "next/link";
import { useState, useEffect, use, useMemo } from "react";

/* eslint-disable @typescript-eslint/no-explicit-any */
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
/* eslint-enable @typescript-eslint/no-explicit-any */

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [similar, setSimilar] = useState<SimilarEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [profileRes, similarRes] = await Promise.all([
          fetch(`/api/profiles/product/${slug}`),
          fetch(`/api/similar/product/${slug}?top=10`),
        ]);
        const profileData = await profileRes.json();
        const similarData = await similarRes.json();
        setProfile(profileData.profile || null);
        setSimilar(similarData.similar || []);
      } catch {
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  // Extract keywords for highlighting
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

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="text-sm text-slate-400 mb-4 flex items-center gap-1.5">
        <Link href="/products" className="hover:text-emerald-600 transition-colors">Products</Link>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        <span className="text-slate-600 font-medium">{profile.entity_name}</span>
      </div>

      {/* Profile header */}
      <div className="glass-card p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{profile.entity_name}</h1>
            <div className="flex gap-2 mt-3 flex-wrap">
              {sf.primary_category && (
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-100">
                  {sf.primary_category as string}
                </span>
              )}
              {sf.age_range && (
                <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                  Ages: {sf.age_range as string}
                </span>
              )}
              {sf.purchase_model && (
                <span className="px-2.5 py-1 bg-slate-50 text-slate-600 rounded-lg text-xs font-medium border border-slate-100">
                  {sf.purchase_model as string}
                </span>
              )}
              {sf.user_rating && (
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-semibold border border-amber-100">
                  Rating: {sf.user_rating}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href={`/analyze?type=product&id=${slug}`}
              className="px-3 py-1.5 text-sm bg-brand-50 text-brand-700 border border-brand-200 rounded-lg hover:bg-brand-100 transition-colors font-medium"
            >
              AI Analysis
            </Link>
            <Link
              href={`/graph?type=product&id=${slug}`}
              className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors font-medium"
            >
              3D Graph
            </Link>
            <Link
              href={`/compare?type=product&ids=${slug}`}
              className="px-3 py-1.5 text-sm bg-slate-50 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium"
            >
              Compare
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile details */}
        <div className="lg:col-span-2 space-y-5">
          {/* LLM Summary */}
          {profile.profile_text && (
            <div className="glass-card p-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Profile Summary
              </h2>
              <p className="text-slate-700 leading-relaxed">
                <HighlightedText text={profile.profile_text} keywords={keywords} />
              </p>
            </div>
          )}

          {/* Subjects */}
          {sf.subjects && (sf.subjects as string[]).length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Subjects</h2>
              <div className="flex flex-wrap gap-2">
                {(sf.subjects as string[]).map((s) => (
                  <span key={s} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Key Features */}
          {sf.key_features && (sf.key_features as string[]).length > 0 && (
            <div className="glass-card p-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Key Features</h2>
              <div className="space-y-2">
                {(sf.key_features as string[]).map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Structured Fields */}
          <div className="glass-card p-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">All Profile Fields</h2>
            <div className="grid grid-cols-1 gap-y-3 text-sm">
              {Object.entries(sf).map(([key, value]) => (
                <div key={key} className="flex justify-between items-baseline py-1 border-b border-slate-50">
                  <span className="text-slate-400 text-xs capitalize">{key.replace(/_/g, " ")}</span>
                  <span className="text-slate-800 font-medium text-right max-w-xs text-xs">
                    {Array.isArray(value) ? (
                      <span className="flex flex-wrap gap-1 justify-end">
                        {value.map((v: string, i: number) => (
                          <span key={i} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[11px]">{v}</span>
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

          {/* Metadata */}
          <div className="glass-card p-3 text-[11px] text-slate-400 flex items-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Schema v{profile.schema_version} | Profiled {new Date(profile.profiled_at).toLocaleDateString()}
          </div>
        </div>

        {/* Right: Similar products */}
        <div className="space-y-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Similar Products
          </h2>
          {similar.length === 0 ? (
            <div className="glass-card p-4 text-sm text-slate-400 text-center">
              No similarity data computed yet.
            </div>
          ) : (
            similar.map((s, i) => (
              <ProductSimilarCard key={s.entity_id} item={s} slug={slug} rank={i + 1} sourceFields={profile.structured_fields} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProductSimilarCard({
  item,
  slug,
  rank,
  sourceFields,
}: {
  item: SimilarEntity;
  slug: string;
  rank: number;
  sourceFields: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
}) {
  const score = Math.round(item.similarity_score * 100);
  const scoreColor = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-400";
  const ringColor = score >= 75 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-400";

  // Find matching keywords
  const matchingFields: string[] = [];
  const sf = item.structured_fields || {};
  if (sf.primary_category && sf.primary_category === sourceFields.primary_category) matchingFields.push(`category: ${sf.primary_category}`);
  if (sf.pedagogy_style && sf.pedagogy_style === sourceFields.pedagogy_style) matchingFields.push(`pedagogy: ${sf.pedagogy_style}`);
  if (sf.purchase_model && sf.purchase_model === sourceFields.purchase_model) matchingFields.push(`model: ${sf.purchase_model}`);
  // Subject overlap
  if (sf.subjects && sourceFields.subjects) {
    const overlap = (sf.subjects as string[]).filter((s: string) =>
      (sourceFields.subjects as string[]).includes(s)
    );
    if (overlap.length > 0) matchingFields.push(...overlap.map((s: string) => `subject: ${s}`));
  }

  const total = item.structured_score + item.embedding_score + (item.graph_score || 0);

  return (
    <div className="glass-card p-4 animate-slide-up" style={{ animationDelay: `${rank * 0.05}s` }}>
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <svg className="w-12 h-12 score-ring" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="15.5" fill="none" className={ringColor} strokeWidth="2.5"
              strokeDasharray={`${score * 0.975} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" />
          </svg>
          <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${scoreColor}`}>{score}</div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">#{rank}</span>
            <Link
              href={`/products/${item.entity_id}`}
              className="text-sm font-medium text-slate-800 hover:text-emerald-600 transition-colors truncate"
            >
              {item.entity_name}
            </Link>
          </div>

          <div className="flex h-1.5 rounded-full overflow-hidden mt-2 gap-px">
            <div className="bg-blue-400 rounded-l-full" style={{ width: `${total > 0 ? (item.structured_score / total) * 100 : 0}%` }} />
            <div className="bg-emerald-400" style={{ width: `${total > 0 ? (item.embedding_score / total) * 100 : 0}%` }} />
            <div className="bg-purple-400 rounded-r-full" style={{ width: `${total > 0 ? ((item.graph_score || 0) / total) * 100 : 0}%` }} />
          </div>
          <div className="flex gap-2 mt-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-blue-400 rounded-full inline-block" /> {Math.round(item.structured_score * 100)}%</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full inline-block" /> {Math.round(item.embedding_score * 100)}%</span>
            <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 bg-purple-400 rounded-full inline-block" /> {Math.round((item.graph_score || 0) * 100)}%</span>
          </div>

          {matchingFields.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {matchingFields.slice(0, 5).map((field) => (
                <span key={field} className="keyword-match text-[10px]">{field}</span>
              ))}
            </div>
          )}

          {item.explanation && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">{item.explanation}</p>
          )}

          <div className="flex gap-3 mt-2">
            <Link href={`/compare?type=product&ids=${slug},${item.entity_id}`}
              className="text-[11px] text-slate-400 hover:text-emerald-600 transition-colors">Compare</Link>
            <Link href={`/analyze?type=product&id=${item.entity_id}`}
              className="text-[11px] text-slate-400 hover:text-emerald-600 transition-colors">AI Analysis</Link>
          </div>
        </div>
      </div>
    </div>
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

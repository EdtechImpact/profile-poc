"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface PeerContextProps {
  schoolId: string;
  matchedProductIds?: string[];
}

interface PeerData {
  peers: Array<{ id: string; name: string; similarity: number }>;
  popular_products: Array<{ product_id: string; product_name: string; peer_count: number; avg_score: number }>;
  peer_count: number;
}

export default function PeerContext({ schoolId, matchedProductIds = [] }: PeerContextProps) {
  const [data, setData] = useState<PeerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/match/peers?school_id=${schoolId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [schoolId]);

  if (loading) {
    return (
      <div className="glass-card p-4 animate-pulse">
        <div className="h-4 bg-slate-100 rounded w-40 mb-3" />
        <div className="flex gap-2">
          <div className="h-8 bg-slate-100 rounded-lg flex-1" />
          <div className="h-8 bg-slate-100 rounded-lg flex-1" />
          <div className="h-8 bg-slate-100 rounded-lg flex-1" />
        </div>
        <div className="h-20 bg-slate-100 rounded-lg mt-3" />
      </div>
    );
  }

  if (error || !data || data.peers.length === 0) return null;

  const maxCount = Math.max(...data.popular_products.map((p) => p.peer_count), 1);

  return (
    <div className="glass-card p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
        </svg>
        <span className="text-xs font-bold text-slate-700">Schools Like Yours</span>
        <span className="text-[9px] text-slate-400 ml-auto">{data.peer_count} peers found</span>
      </div>

      {/* Peer school pills - horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 -mx-1 px-1 scrollbar-thin">
        {data.peers.map((peer, i) => (
          <motion.div
            key={peer.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08 }}
          >
            <Link
              href={`/schools/${peer.id}`}
              className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-[10px] font-semibold text-blue-700 whitespace-nowrap">
                {peer.name.length > 20 ? peer.name.slice(0, 20) + "..." : peer.name}
              </span>
              <span className="text-[9px] text-blue-400 font-mono">{Math.round(peer.similarity * 100)}%</span>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Popular products bar chart */}
      {data.popular_products.length > 0 && (
        <div>
          <div className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Popular Products Among Peers
          </div>
          <div className="space-y-1.5">
            {data.popular_products.map((prod, i) => {
              const youMatch = matchedProductIds.includes(prod.product_id);
              return (
                <motion.div
                  key={prod.product_id}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.06 }}
                >
                  <Link
                    href={`/products/${prod.product_id}`}
                    className="text-[10px] font-medium text-slate-700 hover:text-brand-600 transition-colors w-28 truncate flex-shrink-0"
                  >
                    {prod.product_name}
                  </Link>
                  <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden relative">
                    <motion.div
                      className="h-full bg-gradient-to-r from-violet-400 to-purple-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${(prod.peer_count / maxCount) * 100}%` }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                    />
                    <span className="absolute inset-0 flex items-center justify-end pr-2 text-[8px] font-bold text-slate-500">
                      {prod.peer_count}/{data.peer_count}
                    </span>
                  </div>
                  {youMatch && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold whitespace-nowrap flex-shrink-0">
                      You match
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

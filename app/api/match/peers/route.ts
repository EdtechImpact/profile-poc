import { NextRequest, NextResponse } from "next/server";
import { getNodeSimilarity } from "@/src/lib/neo4j";
import { findRecommendations } from "@/src/similarity/cross-type-engine";
import { getProfile } from "@/src/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const schoolId = searchParams.get("school_id");

  if (!schoolId || schoolId.length > 200) {
    return NextResponse.json({ error: "Valid school_id is required" }, { status: 400 });
  }

  try {
    // 1. Find peer schools via graph similarity
    const peerNodes = await getNodeSimilarity("school", schoolId, 5);

    // Fetch all peer profiles in parallel (avoid N+1)
    const peerProfiles = await Promise.all(
      peerNodes.map((p: { entity_id: string }) => getProfile("school", p.entity_id))
    );
    const peers = peerNodes.map((p: { entity_id: string; graph_score?: number }, i: number) => ({
      id: p.entity_id,
      name: peerProfiles[i]?.entity_name || p.entity_id,
      similarity: Math.round((p.graph_score || 0) * 100) / 100,
    }));

    // 2. Get top product recommendations for each peer (in parallel)
    const productCounts = new Map<string, { product_id: string; product_name: string; total_score: number; count: number }>();

    const peerRecs = await Promise.allSettled(
      peers.map((peer: { id: string }) => findRecommendations("school", peer.id, { top: 3 }))
    );
    for (const result of peerRecs) {
      if (result.status !== "fulfilled") continue;
      for (const rec of result.value) {
        const existing = productCounts.get(rec.entity_id);
        if (existing) {
          existing.count++;
          existing.total_score += rec.match_score;
        } else {
          productCounts.set(rec.entity_id, {
            product_id: rec.entity_id,
            product_name: rec.entity_name,
            total_score: rec.match_score,
            count: 1,
          });
        }
      }
    }

    // 3. Sort by popularity (count first, then avg score)
    const popularProducts = Array.from(productCounts.values())
      .map((p) => ({
        product_id: p.product_id,
        product_name: p.product_name,
        peer_count: p.count,
        avg_score: Math.round((p.total_score / p.count) * 100) / 100,
      }))
      .sort((a, b) => b.peer_count - a.peer_count || b.avg_score - a.avg_score)
      .slice(0, 8);

    return NextResponse.json({
      school_id: schoolId,
      peer_count: peers.length,
      peers,
      popular_products: popularProducts,
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

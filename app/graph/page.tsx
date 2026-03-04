"use client";

import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";

/* eslint-disable @typescript-eslint/no-explicit-any */
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
}) as any;
/* eslint-enable @typescript-eslint/no-explicit-any */

interface GraphNode {
  id: string;
  label: string;
  type: string;
  color?: string;
  properties?: Record<string, unknown>;
  __threeObj?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const NODE_COLORS: Record<string, string> = {
  School: "#60a5fa",
  Product: "#34d399",
  Category: "#fb923c",
  Subject: "#c084fc",
  Trust: "#818cf8",
  Region: "#f472b6",
  Phase: "#2dd4bf",
};

const NODE_SIZES: Record<string, number> = {
  School: 8,
  Product: 8,
  Category: 5,
  Subject: 4,
  Trust: 5,
  Region: 5,
  Phase: 4,
};

export default function GraphPageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
            Loading 3D Graph...
          </div>
        </div>
      }
    >
      <GraphPage />
    </Suspense>
  );
}

function GraphPage() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "school";
  const initialId = searchParams.get("id") || "";

  const [entityType, setEntityType] = useState(initialType);
  const [entityId, setEntityId] = useState(initialId);
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [highlightNodes, setHighlightNodes] = useState<Set<string>>(new Set());
  const [depth, setDepth] = useState(2);
  const graphRef = useRef<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const containerRef = useRef<HTMLDivElement>(null);

  const loadGraph = useCallback(async () => {
    if (!entityId) return;
    setLoading(true);
    setSelectedNode(null);
    try {
      const res = await fetch(
        `/api/graph/neighbors/${entityType}/${entityId}?depth=${depth}`
      );
      const data = await res.json();
      if (data.nodes) {
        const nodes = data.nodes.map((n: GraphNode) => ({
          ...n,
          color: NODE_COLORS[n.type] || "#94a3b8",
        }));
        setGraphData({ nodes, links: data.links || [] });
        setHighlightNodes(new Set([entityId]));
        setTimeout(() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(800, 50);
          }
        }, 500);
      }
    } catch {
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, depth]);

  useEffect(() => {
    if (initialId) loadGraph();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    // Highlight the node and its immediate neighbors
    const neighbors = new Set<string>([node.id]);
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === "string" ? link.source : (link.source as GraphNode).id;
      const tgtId = typeof link.target === "string" ? link.target : (link.target as GraphNode).id;
      if (srcId === node.id) neighbors.add(tgtId);
      if (tgtId === node.id) neighbors.add(srcId);
    });
    setHighlightNodes(neighbors);

    // Aim camera at node
    if (graphRef.current) {
      const n = node as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const distance = 200;
      const distRatio = 1 + distance / Math.hypot(n.x || 0, n.y || 0, n.z || 0);
      graphRef.current.cameraPosition(
        { x: (n.x || 0) * distRatio, y: (n.y || 0) * distRatio, z: (n.z || 0) * distRatio },
        { x: n.x || 0, y: n.y || 0, z: n.z || 0 },
        1000
      );
    }
  }, [graphData.links]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
    setHighlightNodes(new Set());
  }, []);

  return (
    <div className="max-w-full mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">3D Graph Explorer</h1>
          <p className="text-slate-500 text-sm mt-1">
            Interactive 3D visualization of entity relationships and shared attributes
          </p>
        </div>
        {graphData.nodes.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="px-2 py-1 bg-slate-100 rounded-md">
              {graphData.nodes.length} nodes
            </span>
            <span className="px-2 py-1 bg-slate-100 rounded-md">
              {graphData.links.length} edges
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="glass-card p-4 mb-6">
        <div className="flex gap-3 items-end">
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Type</label>
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            >
              <option value="school">School</option>
              <option value="product">Product</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Entity ID</label>
            <input
              type="text"
              value={entityId}
              onChange={(e) => setEntityId(e.target.value)}
              placeholder={entityType === "school" ? "Enter school URN..." : "Enter product slug..."}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
              onKeyDown={(e) => e.key === "Enter" && loadGraph()}
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 block mb-1.5 font-medium">Depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400"
            >
              <option value={1}>1 hop</option>
              <option value={2}>2 hops</option>
              <option value={3}>3 hops</option>
            </select>
          </div>
          <button
            onClick={loadGraph}
            disabled={loading || !entityId}
            className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Loading...
              </>
            ) : (
              "Explore"
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 3D Graph */}
        <div className="lg:col-span-3">
          <div ref={containerRef} className="graph-container relative">
            {graphData.nodes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                {loading ? (
                  <>
                    <div className="w-8 h-8 border-3 border-brand-400/30 border-t-brand-400 rounded-full animate-spin" />
                    <span>Loading graph data...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-16 h-16 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
                    </svg>
                    <span className="text-sm">Enter an entity ID and click Explore</span>
                    <span className="text-xs text-slate-500">Drag to rotate, scroll to zoom, right-click to pan</span>
                  </>
                )}
              </div>
            ) : (
              <ForceGraph3D
                ref={graphRef}
                graphData={graphData}
                nodeLabel={(node: GraphNode) => `${node.type}: ${node.label}`}
                nodeColor={(node: GraphNode) => {
                  if (highlightNodes.size > 0 && !highlightNodes.has(node.id)) {
                    return "#334155";
                  }
                  return node.color || "#94a3b8";
                }}
                nodeOpacity={0.9}
                nodeResolution={16}
                nodeVal={(node: GraphNode) => NODE_SIZES[node.type] || 4}
                linkColor={() => "rgba(148, 163, 184, 0.3)"}
                linkWidth={1}
                linkOpacity={0.4}
                linkDirectionalArrowLength={3}
                linkDirectionalArrowRelPos={1}
                linkDirectionalParticles={1}
                linkDirectionalParticleWidth={1.5}
                linkDirectionalParticleSpeed={0.005}
                linkDirectionalParticleColor={() => "rgba(148, 163, 184, 0.6)"}
                onNodeClick={handleNodeClick}
                onBackgroundClick={handleBackgroundClick}
                backgroundColor="rgba(0,0,0,0)"
                width={containerRef.current?.clientWidth || 900}
                height={698}
                showNavInfo={false}
                enableNodeDrag={true}
                enableNavigationControls={true}
                warmupTicks={50}
                cooldownTicks={200}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.3}
              />
            )}

            {/* Floating legend */}
            {graphData.nodes.length > 0 && (
              <div className="absolute bottom-4 left-4 bg-slate-900/80 backdrop-blur-sm rounded-xl px-4 py-3 border border-slate-700/50">
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(NODE_COLORS).map(([type, color]) => {
                    const count = graphData.nodes.filter(n => n.type === type).length;
                    if (count === 0) return null;
                    return (
                      <div key={type} className="flex items-center gap-1.5 text-xs">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}40` }}
                        />
                        <span className="text-slate-300">{type}</span>
                        <span className="text-slate-500">({count})</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Controls hint */}
            {graphData.nodes.length > 0 && (
              <div className="absolute top-4 right-4 text-[10px] text-slate-500 bg-slate-900/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/30">
                Drag: rotate | Scroll: zoom | Right-click: pan
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Node Details */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Node Details
            </h2>
            {selectedNode ? (
              <div className="glass-card p-4 animate-slide-in-right">
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: NODE_COLORS[selectedNode.type] || "#94a3b8",
                      boxShadow: `0 0 8px ${NODE_COLORS[selectedNode.type] || "#94a3b8"}50`,
                    }}
                  />
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: NODE_COLORS[selectedNode.type] || "#94a3b8" }}
                  >
                    {selectedNode.type}
                  </span>
                </div>
                <div className="font-semibold text-slate-800 mb-3">
                  {selectedNode.label}
                </div>

                {selectedNode.properties &&
                  Object.entries(selectedNode.properties).length > 0 && (
                    <div className="space-y-2 text-sm border-t border-slate-100 pt-3">
                      {Object.entries(selectedNode.properties).map(
                        ([key, value]) => (
                          <div key={key} className="flex justify-between gap-2">
                            <span className="text-slate-400 text-xs capitalize">
                              {key.replace(/_/g, " ")}
                            </span>
                            <span className="text-slate-700 text-xs font-medium text-right">
                              {String(value)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  )}

                {(selectedNode.type === "School" || selectedNode.type === "Product") && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                    <Link
                      href={`/${selectedNode.type === "School" ? "schools" : "products"}/${selectedNode.id}`}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/analyze?type=${selectedNode.type.toLowerCase()}&id=${selectedNode.id}`}
                      className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                      AI Analysis
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-4 text-sm text-slate-400 text-center">
                Click a node to inspect
              </div>
            )}
          </div>

          {/* Communities */}
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Community Detection
            </h2>
            <CommunityPanel entityType={entityType} />
          </div>
        </div>
      </div>
    </div>
  );
}

function CommunityPanel({ entityType }: { entityType: string }) {
  const [communities, setCommunities] = useState<
    { community: string; members: string[] }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const loadCommunities = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/graph/communities?type=${entityType}`);
      const data = await res.json();
      setCommunities(data.communities || []);
    } catch {
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={loadCommunities}
        disabled={loading}
        className="w-full px-3 py-2.5 text-sm font-medium bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
            Detecting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
            Detect Communities
          </>
        )}
      </button>
      {communities.length > 0 && (
        <div className="space-y-2 mt-3">
          {communities.map((c, i) => (
            <div key={i} className="glass-card p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-semibold text-slate-700">
                  Cluster {i + 1}
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium">
                  {c.members.length} members
                </span>
              </div>
              <div className="text-[11px] text-slate-500 leading-relaxed">
                {c.members.slice(0, 4).join(", ")}
                {c.members.length > 4 && ` +${c.members.length - 4} more`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

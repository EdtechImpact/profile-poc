"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAWSCredentials } from "@/app/components/aws-credentials-provider";
import { useChat, Thread } from "@/app/hooks/useChat";
import { ChatMessageComponent } from "@/app/components/chat/ChatMessage";
import { EntityClickContext } from "@/app/components/chat/ToolVisuals";
import { DetailModal } from "@/app/components/chat/DetailModal";

const PRESET_QUERIES = [
  {
    label: "Best products for a school",
    desc: "Find top-matched products with evidence",
    query: "What are the top 5 product recommendations for school ",
    gradient: "from-brand-500/10 to-purple-500/10",
    border: "border-brand-200/40",
    iconColor: "text-brand-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    label: "Compare products",
    desc: "Side-by-side impact & features",
    query: "Compare the educational impact and features of ",
    gradient: "from-emerald-500/10 to-teal-500/10",
    border: "border-emerald-200/40",
    iconColor: "text-emerald-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    label: "Product alternatives",
    desc: "Discover competing products",
    query: "What are the alternatives to ",
    gradient: "from-amber-500/10 to-orange-500/10",
    border: "border-amber-200/40",
    iconColor: "text-amber-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
      </svg>
    ),
  },
  {
    label: "Match report",
    desc: "Generate evidence-backed report",
    query: "Generate a comprehensive match report for school ",
    gradient: "from-rose-500/10 to-pink-500/10",
    border: "border-rose-200/40",
    iconColor: "text-rose-500",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
  },
];

function ThreadListItem({
  thread,
  isActive,
  onClick,
  onDelete,
}: {
  thread: Thread;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <button
      className={`group w-full text-left flex items-start gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 ${
        isActive
          ? "bg-brand-50 border border-brand-200/60 shadow-sm"
          : "hover:bg-slate-50 border border-transparent"
      }`}
      onClick={onClick}
    >
      <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
        isActive ? "bg-brand-100 text-brand-600" : "bg-slate-100 text-slate-400"
      }`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${isActive ? "text-brand-800" : "text-slate-700"}`}>
          {thread.title || "New conversation"}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(thread.updated_at)}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="opacity-0 group-hover:opacity-100 mt-0.5 p-1 rounded-md hover:bg-red-50 text-slate-300 hover:text-red-400 transition-all"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </button>
  );
}

export default function ChatPage() {
  const { getHeaders, isConfigured, setShowSettings } = useAWSCredentials();
  const {
    messages, threads, threadId, isStreaming, error,
    sendMessage, stopStreaming, loadThreads, loadThread, newThread, deleteThread,
  } = useChat({ getHeaders });

  const [input, setInput] = useState("");
  const [modalEntity, setModalEntity] = useState<{ type: "school" | "product"; id: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleEntityClick = useCallback((entityType: "school" | "product", entityId: string) => {
    setModalEntity({ type: entityType, id: entityId });
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const el = inputRef.current;
    if (el) { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 200) + "px"; }
  }, [input]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!isConfigured) {
    return (
      <div className="max-w-md mx-auto mt-32 text-center animate-fade-in-up">
        <div className="glass-card p-8">
          <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-5 shadow-glow-brand relative">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
            <div className="absolute inset-0 rounded-2xl gradient-bg animate-ping opacity-15" />
          </div>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Configure AWS Credentials</h2>
          <p className="text-sm text-slate-500 mb-5">Match Advisor requires AWS Bedrock access for Claude inference.</p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-6 py-2.5 gradient-bg text-white rounded-xl text-sm font-semibold hover:shadow-glow-brand transition-all"
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <EntityClickContext.Provider value={handleEntityClick}>
    <div className="flex h-[calc(100vh-0px)] -m-6 -mt-4">
      {/* ─── Detail Modal ─── */}
      {modalEntity && (
        <DetailModal
          entityType={modalEntity.type}
          entityId={modalEntity.id}
          onClose={() => setModalEntity(null)}
        />
      )}
      {/* ─── Thread Sidebar ─── */}
      <div className="w-[260px] bg-white/60 backdrop-blur-sm border-r border-slate-200/60 flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-200/60">
          <button
            onClick={newThread}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl gradient-bg text-white text-xs font-semibold hover:shadow-glow-brand transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            New Conversation
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {threads.map((t) => (
            <ThreadListItem
              key={t.id}
              thread={t}
              isActive={t.id === threadId}
              onClick={() => loadThread(t.id)}
              onDelete={() => deleteThread(t.id)}
            />
          ))}
          {threads.length === 0 && (
            <div className="text-center py-12 px-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <p className="text-xs text-slate-400 font-medium">No conversations yet</p>
              <p className="text-[10px] text-slate-300 mt-1">Start one with the presets below</p>
            </div>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-slate-200/60">
          <div className="flex items-center gap-2 px-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] text-slate-400 font-medium">11 tools available</span>
          </div>
        </div>
      </div>

      {/* ─── Main Chat ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            /* ─── Empty State ─── */
            <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
              {/* Hero */}
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-3xl gradient-bg flex items-center justify-center shadow-glow-brand">
                  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                  </svg>
                </div>
                <div className="absolute -inset-3 rounded-[2rem] gradient-bg opacity-10 blur-xl animate-pulse-soft" />
              </div>

              <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Match Advisor</h1>
              <p className="text-sm text-slate-500 mb-10 text-center max-w-lg leading-relaxed">
                AI-powered school-product matching with educational impact analysis,
                product alternatives, and evidence-backed recommendations.
              </p>

              {/* Preset cards */}
              <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
                {PRESET_QUERIES.map((preset, i) => (
                  <button
                    key={preset.label}
                    onClick={() => setInput(preset.query)}
                    className={`card-glow text-left px-4 py-4 rounded-2xl bg-gradient-to-br ${preset.gradient} border ${preset.border} transition-all group animate-fade-in-up`}
                    style={{ animationDelay: `${i * 0.08}s`, animationFillMode: "both" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 ${preset.iconColor} opacity-60 group-hover:opacity-100 transition-opacity`}>
                        {preset.icon}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors block">
                          {preset.label}
                        </span>
                        <span className="text-xs text-slate-400 mt-0.5 block">
                          {preset.desc}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ─── Messages ─── */
            <div className="max-w-3xl mx-auto px-6 py-6">
              {messages.map((msg, i) => (
                <div key={msg.id} className="animate-fade-in-up" style={{ animationDelay: `${Math.min(i * 0.03, 0.3)}s`, animationFillMode: "both" }}>
                  <ChatMessageComponent message={msg} />
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="max-w-3xl mx-auto w-full px-6 mb-2">
            <div className="px-4 py-2.5 rounded-xl bg-red-50 border border-red-200/50 text-red-600 text-xs font-medium flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* ─── Input ─── */}
        <div className="border-t border-slate-200/60 bg-white/40 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="glass-card-static !rounded-2xl flex items-end gap-3 px-4 py-3 focus-within:shadow-glow transition-shadow duration-300 focus-within:border-brand-300/50">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about school-product matching, impact scores, alternatives..."
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 resize-none outline-none max-h-[200px] leading-relaxed"
                rows={1}
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="shrink-0 w-9 h-9 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200/50 flex items-center justify-center transition-all"
                  title="Stop generating"
                >
                  <svg className="w-3.5 h-3.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="shrink-0 w-9 h-9 rounded-xl gradient-bg flex items-center justify-center disabled:opacity-25 hover:shadow-glow-brand transition-all"
                  title="Send message"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Powered by Claude via AWS Bedrock &middot; 11 specialized matching tools &middot; Press Enter to send
            </p>
          </div>
        </div>
      </div>
    </div>
    </EntityClickContext.Provider>
  );
}

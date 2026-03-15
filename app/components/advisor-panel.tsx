"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAWSCredentials } from "@/app/components/aws-credentials-provider";
import { useChat } from "@/app/hooks/useChat";
import { ChatMessageComponent } from "@/app/components/chat/ChatMessage";

interface AdvisorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string | null;
}

export function AdvisorPanel({ isOpen, onClose, initialQuery }: AdvisorPanelProps) {
  const { getHeaders, isConfigured, setShowSettings } = useAWSCredentials();
  const {
    messages, isStreaming, error,
    sendMessage, stopStreaming, newThread,
  } = useChat({ getHeaders });

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialQuerySentRef = useRef<string | null>(null);

  // Auto-send initialQuery when panel opens with one
  useEffect(() => {
    if (isOpen && initialQuery && isConfigured && initialQuery !== initialQuerySentRef.current) {
      initialQuerySentRef.current = initialQuery;
      newThread();
      // Small delay to let state settle after newThread
      const timer = setTimeout(() => {
        sendMessage(initialQuery);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialQuery, isConfigured, newThread, sendMessage]);

  // Reset initialQuerySentRef when panel closes
  useEffect(() => {
    if (!isOpen) {
      initialQuerySentRef.current = null;
    }
  }, [isOpen]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 150) + "px";
    }
  }, [input]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;
    setInput("");
    sendMessage(trimmed);
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-[420px] max-w-[90vw] z-50 flex flex-col bg-white shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl gradient-bg flex items-center justify-center shadow-glow-brand">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Match Advisor</h2>
              <p className="text-[10px] text-slate-400">AI-powered matching assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                newThread();
                setInput("");
              }}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              title="New conversation"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"
              title="Close"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {!isConfigured ? (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <div className="glass-card-static p-6 text-center">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-4 shadow-glow-brand">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h3 className="text-sm font-bold text-slate-800 mb-1">Configure AWS Credentials</h3>
                <p className="text-xs text-slate-500 mb-4">AWS Bedrock access is required for the advisor.</p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-5 py-2 gradient-bg text-white rounded-xl text-xs font-semibold hover:shadow-glow-brand transition-all"
                >
                  Open Settings
                </button>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-4 shadow-glow-brand">
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Match Advisor</h3>
              <p className="text-xs text-slate-500 text-center max-w-[280px] leading-relaxed">
                Ask about school-product matching, impact scores, product alternatives, and more.
              </p>
            </div>
          ) : (
            <div className="px-4 py-4">
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
        {error ? (
          <div className="px-4 mb-2">
            <div className="px-3 py-2 rounded-xl bg-red-50 border border-red-200/50 text-red-600 text-xs font-medium flex items-center gap-2">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {error}
            </div>
          </div>
        ) : null}

        {/* Input */}
        {isConfigured ? (
          <div className="border-t border-slate-200/60 bg-white/80 backdrop-blur-sm px-4 py-3 shrink-0">
            <div className="glass-card-static !rounded-xl flex items-end gap-2 px-3 py-2.5 focus-within:shadow-glow transition-shadow duration-300 focus-within:border-brand-300/50">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about matching, alternatives..."
                className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 resize-none outline-none max-h-[150px] leading-relaxed"
                rows={1}
                disabled={isStreaming}
              />
              {isStreaming ? (
                <button
                  onClick={stopStreaming}
                  className="shrink-0 w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200/50 flex items-center justify-center transition-all"
                  title="Stop generating"
                >
                  <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="shrink-0 w-8 h-8 rounded-lg gradient-bg flex items-center justify-center disabled:opacity-25 hover:shadow-glow-brand transition-all"
                  title="Send message"
                >
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                  </svg>
                </button>
              )}
            </div>
            <p className="text-[9px] text-slate-400 mt-1.5 text-center">
              Powered by Claude via AWS Bedrock &middot; Press Enter to send
            </p>
          </div>
        ) : null}
      </div>
    </>
  );
}

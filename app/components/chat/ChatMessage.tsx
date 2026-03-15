"use client";

import { ChatMessage as ChatMessageType } from "@/app/hooks/useChat";
import { ToolCallCard } from "./ToolCallCard";
import { ToolVisual, VISUAL_TOOL_NAMES } from "./ToolVisuals";

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const result: React.ReactElement[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        result.push(
          <pre key={i} className="bg-slate-50 rounded-xl p-3.5 text-xs overflow-x-auto my-3 border border-slate-200/50 font-mono text-slate-700">
            <code>{codeLines.join("\n")}</code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) { codeLines.push(line); continue; }

    if (line.startsWith("### ")) {
      result.push(<h3 key={i} className="text-sm font-bold text-slate-800 mt-4 mb-1.5 flex items-center gap-1.5"><span className="w-1 h-1 rounded-full bg-brand-400" />{formatInline(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      result.push(<h2 key={i} className="text-[15px] font-bold text-slate-800 mt-5 mb-2">{formatInline(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      result.push(<h1 key={i} className="text-base font-extrabold text-slate-900 mt-5 mb-2">{formatInline(line.slice(2))}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      result.push(
        <div key={i} className="flex gap-2.5 ml-1 my-0.5">
          <span className="text-brand-400 mt-1.5 shrink-0"><svg className="w-1.5 h-1.5" fill="currentColor" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4"/></svg></span>
          <span className="text-slate-600">{formatInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)$/);
      if (match) {
        result.push(
          <div key={i} className="flex gap-2.5 ml-1 my-0.5">
            <span className="text-brand-500 font-semibold min-w-[1.2rem] text-right">{match[1]}.</span>
            <span className="text-slate-600">{formatInline(match[2])}</span>
          </div>
        );
      }
    } else if (line.trim() === "") {
      result.push(<div key={i} className="h-1.5" />);
    } else {
      result.push(<p key={i} className="text-slate-600 leading-relaxed">{formatInline(line)}</p>);
    }
  }

  return result;
}

interface InlineMatch { index: number; length: number; node: React.ReactNode }

function formatInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const codeMatch = remaining.match(/`(.+?)`/);
    const candidates: InlineMatch[] = [];

    if (boldMatch) {
      const idx = remaining.indexOf(boldMatch[0]);
      candidates.push({ index: idx, length: boldMatch[0].length, node: <strong key={key++} className="font-semibold text-slate-800">{boldMatch[1]}</strong> });
    }
    if (codeMatch) {
      const idx = remaining.indexOf(codeMatch[0]);
      candidates.push({ index: idx, length: codeMatch[0].length, node: <code key={key++} className="px-1.5 py-0.5 bg-brand-50 text-brand-700 rounded-md text-xs font-mono">{codeMatch[1]}</code> });
    }

    if (candidates.length === 0) { parts.push(remaining); break; }
    candidates.sort((a, b) => a.index - b.index);
    const firstMatch = candidates[0];
    if (firstMatch.index > 0) parts.push(remaining.slice(0, firstMatch.index));
    parts.push(firstMatch.node);
    remaining = remaining.slice(firstMatch.index + firstMatch.length);
  }

  return <>{parts}</>;
}

export function ChatMessageComponent({ message }: { message: ChatMessageType }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-5`}>
      {/* Avatar for assistant */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg gradient-bg flex items-center justify-center mr-3 mt-1 shrink-0 shadow-sm">
          <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
          </svg>
        </div>
      )}

      <div
        className={`max-w-[80%] ${
          isUser
            ? "gradient-bg text-white rounded-2xl rounded-br-md shadow-glow-brand/30"
            : "glass-card-static !bg-white/95 rounded-2xl rounded-bl-md"
        } px-4 py-3 text-[13px]`}
      >
        {isUser ? (
          <p className="leading-relaxed font-medium">{message.content}</p>
        ) : (
          <>
            {/* Tool calls with visual results */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mb-3 space-y-2">
                {message.toolCalls.map((tc) => (
                  <div key={tc.id}>
                    <ToolCallCard toolCall={tc} />
                    {tc.resultData && tc.status === "done" && VISUAL_TOOL_NAMES.has(tc.name) && (
                      <div className="mt-2 ml-1 p-3 rounded-xl bg-slate-50/80 border border-slate-100">
                        <ToolVisual toolCall={tc} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Assistant text */}
            {message.content && (
              <div className="space-y-0.5 prose-analysis">
                {renderMarkdown(message.content)}
              </div>
            )}

            {/* Streaming indicator */}
            {message.isStreaming && !message.content && (!message.toolCalls || message.toolCalls.length === 0) && (
              <div className="flex items-center gap-1 py-1">
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-brand-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-brand-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-slate-400 ml-2">Thinking...</span>
              </div>
            )}

            {/* Streaming cursor */}
            {message.isStreaming && message.content && (
              <span className="inline-block w-0.5 h-4 bg-brand-400 animate-pulse ml-0.5 -mb-0.5" />
            )}
          </>
        )}
      </div>

      {/* Avatar for user */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center ml-3 mt-1 shrink-0">
          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
      )}
    </div>
  );
}

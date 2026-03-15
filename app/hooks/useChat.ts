"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  isStreaming?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
  summary?: string;
  resultData?: Record<string, unknown>;
  status: "running" | "done";
}

export interface Thread {
  id: string;
  title: string | null;
  entity_context: Record<string, unknown> | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

interface UseChatOptions {
  getHeaders: () => Record<string, string>;
}

export function useChat({ getHeaders }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/threads?limit=30");
      const data = await res.json();
      setThreads(data.threads || []);
    } catch { /* ignore */ }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat/threads/${id}`);
      const data = await res.json();
      if (data.thread) {
        setThreadId(id);

        // Reconstruct messages from DB format
        const msgs: ChatMessage[] = [];
        for (const msg of data.messages || []) {
          if (msg.role === "user") {
            msgs.push({ id: msg.id, role: "user", content: msg.content || "" });
          } else if (msg.role === "assistant") {
            const toolCalls: ToolCall[] = (msg.tool_calls || []).map(
              (tc: { id: string; name: string; input: Record<string, unknown> }) => ({
                ...tc,
                status: "done" as const,
              })
            );
            msgs.push({
              id: msg.id,
              role: "assistant",
              content: msg.content || "",
              toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
            });
          }
          // Skip tool_result messages — they're implicit in the assistant's tool calls
        }
        setMessages(msgs);
      }
    } catch { /* ignore */ }
  }, []);

  const sendMessage = useCallback(async (content: string, entityContext?: Record<string, unknown>) => {
    if (isStreaming) return;
    setError(null);
    setIsStreaming(true);

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, userMsg]);

    // Create assistant placeholder
    const assistantId = `assistant-${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      toolCalls: [],
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const headers = getHeaders();
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({
          thread_id: threadId,
          message: content,
          entity_context: entityContext,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            switch (event.type) {
              case "thread_id":
                if (!threadId) {
                  setThreadId(event.thread_id);
                  loadThreads(); // Refresh thread list
                }
                break;

              case "text_delta":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + event.content }
                      : m
                  )
                );
                break;

              case "thinking_start":
              case "thinking_delta":
              case "thinking_end":
                // Could render thinking indicator — skip for now
                break;

              case "tool_call":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolCalls: [
                            ...(m.toolCalls || []),
                            {
                              id: event.id,
                              name: event.name,
                              input: event.input,
                              status: "running",
                            },
                          ],
                        }
                      : m
                  )
                );
                break;

              case "tool_result":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? {
                          ...m,
                          toolCalls: (m.toolCalls || []).map((tc) =>
                            tc.id === event.id
                              ? { ...tc, summary: event.summary, resultData: event.data, status: "done" as const }
                              : tc
                          ),
                        }
                      : m
                  )
                );
                break;

              case "done":
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, isStreaming: false } : m
                  )
                );
                break;

              case "error":
                setError(event.error);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content || "An error occurred.", isStreaming: false }
                      : m
                  )
                );
                break;
            }
          } catch { /* malformed SSE line, skip */ }
        }
      }
    } catch (e: unknown) {
      if ((e as Error).name !== "AbortError") {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "Failed to get response.", isStreaming: false }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming, threadId, getHeaders, loadThreads]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const newThread = useCallback(() => {
    setThreadId(null);
    setMessages([]);
    setError(null);
  }, []);

  const deleteThread = useCallback(async (id: string) => {
    try {
      await fetch(`/api/chat/threads/${id}`, { method: "DELETE" });
      setThreads((prev) => prev.filter((t) => t.id !== id));
      if (threadId === id) {
        setThreadId(null);
        setMessages([]);
      }
    } catch { /* ignore */ }
  }, [threadId]);

  return {
    messages,
    threads,
    threadId,
    isStreaming,
    error,
    sendMessage,
    stopStreaming,
    loadThreads,
    loadThread,
    newThread,
    deleteThread,
  };
}

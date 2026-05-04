"use client";

import { useCallback, useRef } from "react";
import { useStore, makeId } from "@/store/useStore";
import type { SSEEvent, AgentStep } from "@/lib/types";

export function useChat() {
  const abortRef = useRef<AbortController | null>(null);
  const store = useStore();

  const send = useCallback(async () => {
    const {
      messages,
      activeProviderId,
      providers,
      agentMode,
      temperature,
      isGenerating,
    } = useStore.getState();

    if (isGenerating || messages.length === 0) return;

    const last = messages[messages.length - 1];
    if (last.role !== "user") return;

    const provider = providers.find((p) => p.id === activeProviderId);
    if (!provider) {
      useStore.setState({ error: "No provider selected" });
      return;
    }

    // Prepare messages for API (exclude the empty assistant placeholder)
    const apiMessages = messages
      .filter((m) => m.role !== "system" && m.content.trim() !== "")
      .map((m) => ({ role: m.role, content: m.content }));

    const abort = new AbortController();
    abortRef.current = abort;

    let accumulated = "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          provider: {
            type: provider.type,
            baseUrl: provider.baseUrl,
            model: provider.model,
            apiKey: provider.apiKey,
          },
          agentMode,
          temperature,
        }),
        signal: abort.signal,
      });

      if (!response.ok) {
        const errBody = await response.text();
        useStore.setState({
          error: `API error ${response.status}: ${errBody}`,
          isGenerating: false,
        });
        return;
      }

      if (!response.body) {
        useStore.setState({ error: "No response stream", isGenerating: false });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (!data) continue;

          try {
            const event: SSEEvent = JSON.parse(data);

            switch (event.type) {
              case "token": {
                accumulated += event.content;
                useStore.getState().updateLastAssistant(accumulated);
                break;
              }

              case "tool_call": {
                const step: AgentStep = {
                  type: "tool_call",
                  iteration: event.iteration,
                  content: `${event.name}(${formatArgs(event.arguments)})`,
                  toolCall: {
                    id: event.id,
                    name: event.name,
                    arguments: event.arguments,
                  },
                  language: event.language,
                };
                useStore.getState().addStep(step);
                break;
              }

              case "tool_result": {
                const step: AgentStep = {
                  type: "tool_result",
                  iteration: event.iteration,
                  content: event.content.slice(0, 500),
                  toolResult: {
                    content: event.content,
                    isError: event.isError,
                  },
                };
                useStore.getState().addStep(step);
                break;
              }

              case "step": {
                useStore.getState().addStep(event.step);
                break;
              }

              case "error": {
                useStore.getState().setError(event.message);
                break;
              }

              case "done": {
                // Finalize
                break;
              }
            }
          } catch {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        useStore.getState().setError(err.message || "Request failed");
      }
    } finally {
      useStore.getState().setGenerating(false);
      abortRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    const { messages } = useStore.getState();
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last.content.trim() === "") {
      useStore.setState({
        messages: messages.slice(0, -1),
        isGenerating: false,
      });
    } else {
      useStore.getState().setGenerating(false);
    }
  }, []);

  return { send, stop };
}

function formatArgs(args: Record<string, unknown>): string {
  return Object.entries(args)
    .map(([k, v]) => `${k}="${String(v).slice(0, 40)}"`)
    .join(", ");
}

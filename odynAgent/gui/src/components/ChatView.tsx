"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { useStore } from "@/store/useStore";
import { useChat } from "@/hooks/useChat";
import { Header, StopButton } from "@/components/Header";
import { MessageBubble } from "@/components/MessageBubble";
import { ChatInput } from "@/components/ChatInput";
import { ToolCallCard } from "@/components/ToolCallCard";
import { TodoBar } from "@/components/TodoBar";
import { Sparkles, Zap, Bot, Cpu, Cloud, Globe } from "lucide-react";
import clsx from "clsx";

export function ChatView() {
  const messages = useStore((s) => s.messages);
  const steps = useStore((s) => s.steps);
  const isGenerating = useStore((s) => s.isGenerating);
  const error = useStore((s) => s.error);
  const agentMode = useStore((s) => s.agentMode);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [connecting, setConnecting] = useState(false);

  const { send, stop } = useChat();

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, steps]);

  // Listen for send events from store and trigger the API call
  const prevMsgCountRef = useRef(0);
  useEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      const last = messages[messages.length - 1];
      if (last?.role === "user") {
        // Trigger send
        send();
      }
    }
    prevMsgCountRef.current = messages.length;
  }, [messages.length, send]);

  // Connect to MLX server on mount
  useEffect(() => {
    const provider = useStore.getState().providers.find(
      (p) => p.id === useStore.getState().activeProviderId
    );
    if (provider?.type === "local-mlx") {
      setConnecting(true);
      // Quick health check
      fetch(`${provider.baseUrl}/v1/models`, {
        signal: AbortSignal.timeout(5000),
      })
        .then((res) => {
          if (res.ok) setConnecting(false);
          else setConnecting(false);
        })
        .catch(() => setConnecting(false));
    }
  }, [useStore.getState().activeProviderId]);

  const visibleMessages = messages.filter((m) => m.role !== "system");
  const isEmpty = visibleMessages.length === 0;
  const activeProvider = useStore((s) =>
    s.providers.find((p) => p.id === s.activeProviderId)
  );

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    stop();
  }, [stop]);

  // Check for ongoing tool results (last step is a tool_call waiting for result)
  const lastStep = steps[steps.length - 1];
  const isWaitingForResult =
    isGenerating && lastStep?.type === "tool_call";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <Header />

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyState
            agentMode={agentMode}
            connecting={connecting}
            provider={activeProvider}
          />
        ) : (
          <div className="max-w-4xl mx-auto py-6 space-y-1">
            {visibleMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}

            {/* Agent steps (tool calls, results, etc.) */}
            {steps.length > 0 && isGenerating && (
              <div className="space-y-1 mt-2">
                {steps.map((step, i) => (
                  <ToolCallCard key={`step-${i}`} step={step} />
                ))}

                {/* Waiting indicator after tool call */}
                {isWaitingForResult && (
                  <div className="flex items-center gap-2 px-4 py-1.5 animate-pulse-slow">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce [animation-delay:0ms]" />
                    <span className="text-xs text-gray-500">
                      Executing...
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Final steps when done */}
            {steps.length > 0 && !isGenerating && (
              <div className="space-y-1 mt-2">
                {steps
                  .filter((s) => s.type === "final")
                  .map((step, i) => (
                    <div
                      key={`final-${i}`}
                      className="flex items-center gap-2 px-4 py-1.5"
                    >
                      <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                      <span className="text-xs text-green-400/70">
                        {step.content}
                      </span>
                    </div>
                  ))}
              </div>
            )}

            {/* Stop button */}
            {isGenerating && (
              <div className="flex justify-center py-4">
                <StopButton onClick={handleStop} />
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Todo bar */}
      {isGenerating && <TodoBar />}

      {/* Error banner */}
      {error && !isGenerating && (
        <div className="shrink-0 mx-4 mb-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 animate-fade-in">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Input */}
      <ChatInput />
    </div>
  );
}

// ─── Empty State ───────────────────────────────────────────────────────

function EmptyState({
  agentMode,
  connecting,
  provider,
}: {
  agentMode: boolean;
  connecting: boolean;
  provider: any;
}) {
  const setModelPickerOpen = useStore((s) => s.setModelPickerOpen);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 text-center">
      {/* Logo */}
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-dark via-accent to-teal flex items-center justify-center mb-6 shadow-xl shadow-accent-dark/20">
        <Sparkles className="w-8 h-8 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-gray-100 mb-2 tracking-tight">
        Odyn Agent
      </h2>
      <p className="text-sm text-gray-400 max-w-md mb-8 leading-relaxed">
        Your AI-powered assistant running entirely on local hardware.
        {agentMode
          ? " Agent mode is active — Odyn can use tools to complete tasks."
          : " Chat mode — conversational responses without tools."}
      </p>

      {/* Mode badge */}
      <div className="flex items-center gap-2 mb-6">
        <div
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium",
            agentMode
              ? "bg-accent-dark/10 text-accent-light border-accent-dark/20"
              : "bg-teal/10 text-teal border-teal/20"
          )}
        >
          {agentMode ? (
            <>
              <Zap className="w-3.5 h-3.5" />
              Agent Mode
            </>
          ) : (
            <>
              <Bot className="w-3.5 h-3.5" />
              Chat Mode
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        <button
          onClick={() => {
            useStore.getState().sendMessage("Explain how transformers work");
          }}
          className="p-3 rounded-xl bg-surface-200/60 border border-surface-400/50 hover:border-surface-400 text-left transition-all hover:bg-surface-200 group"
        >
          <p className="text-xs font-medium text-gray-300 mb-1">
            💬 Ask a question
          </p>
          <p className="text-[10px] text-gray-500 group-hover:text-gray-400">
            &quot;Explain how transformers work&quot;
          </p>
        </button>

        <button
          onClick={() => {
            useStore.getState().sendMessage("Create a simple Python script that lists all files in the current directory and sorts them by size");
          }}
          className="p-3 rounded-xl bg-surface-200/60 border border-surface-400/50 hover:border-surface-400 text-left transition-all hover:bg-surface-200 group"
        >
          <p className="text-xs font-medium text-gray-300 mb-1">
            🔧 Write code
          </p>
          <p className="text-[10px] text-gray-500 group-hover:text-gray-400">
            &quot;Create a Python script that...&quot;
          </p>
        </button>

        <button
          onClick={() => {
            useStore.getState().sendMessage("Search the web for the latest developments in AI agents and summarize the top findings");
          }}
          className="p-3 rounded-xl bg-surface-200/60 border border-surface-400/50 hover:border-surface-400 text-left transition-all hover:bg-surface-200 group"
        >
          <p className="text-xs font-medium text-gray-300 mb-1">
            🔍 Research
          </p>
          <p className="text-[10px] text-gray-500 group-hover:text-gray-400">
            &quot;Search for AI agent developments&quot;
          </p>
        </button>
      </div>

      {/* Connection status - prominent warning for local MLX */}
      {provider?.type === "local-mlx" && (
        <div className="mt-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 max-w-lg">
          <div className="flex items-start gap-3">
            <Cpu className="w-5 h-5 text-yellow-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-yellow-400 mb-2">
                ⚠️ MLX Server Required
              </p>
              <p className="text-[10px] text-yellow-400/80 mb-2">
                Start the MLX server in another terminal:
              </p>
              <code className="block px-2 py-1.5 rounded bg-surface-300 text-gray-300 font-mono text-[9px] mb-2">
                python3 -m mlx_lm.server --model {provider.model} --port {provider.port || 8080}
              </code>
              <p className="text-[10px] text-gray-500">
                Or switch to cloud API in Settings → Model Picker
              </p>
            </div>
          </div>
        </div>
      )}

      {connecting && (
        <div className="mt-6 flex items-center gap-2 text-xs text-yellow-400/70">
          <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          Checking MLX server connection...
        </div>
      )}

      {provider?.type === "cloud-api" && (
        <div className="mt-6 flex items-center gap-2 text-[10px] text-green-400">
          <Cloud className="w-3 h-3" />
          Connected to cloud API
        </div>
      )}
    </div>
  );
}

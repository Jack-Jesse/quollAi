"use client";

import { useStore } from "@/store/useStore";
import {
  PanelLeftOpen,
  Zap,
  Bot,
  Circle,
  Loader2,
  StopCircle,
} from "lucide-react";
import clsx from "clsx";

export function Header() {
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const agentMode = useStore((s) => s.agentMode);
  const isGenerating = useStore((s) => s.isGenerating);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const providers = useStore((s) => s.providers);
  const steps = useStore((s) => s.steps);
  const error = useStore((s) => s.error);

  const provider = providers.find((p) => p.id === activeProviderId);

  const toolCallCount = steps.filter(
    (s) => s.type === "tool_call"
  ).length;

  return (
    <div className="flex items-center justify-between px-4 h-12 border-b border-surface-400/50 bg-surface-50/40 backdrop-blur-sm shrink-0">
      {/* Left */}
      <div className="flex items-center gap-3">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md hover:bg-surface-300 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-2">
          {agentMode ? (
            <div className="flex items-center gap-1.5 text-xs text-accent-light bg-accent-dark/10 px-2 py-1 rounded-md border border-accent-dark/20">
              <Zap className="w-3 h-3" />
              Agent
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-teal bg-teal/10 px-2 py-1 rounded-md border border-teal/20">
              <Bot className="w-3 h-3" />
              Chat
            </div>
          )}

          {provider && (
            <span className="text-xs text-gray-500 font-mono hidden sm:inline truncate max-w-[200px]">
              {provider.model}
            </span>
          )}
        </div>
      </div>

      {/* Center - Status */}
      <div className="flex items-center gap-2">
        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse-slow">
            <Loader2 className="w-3 h-3 animate-spin text-accent" />
            {toolCallCount > 0 ? (
              <span>
                Step {toolCallCount} · Agent working
              </span>
            ) : (
              <span>Generating...</span>
            )}
          </div>
        )}

        {!isGenerating && error && (
          <div className="flex items-center gap-1.5 text-xs text-red-400">
            <Circle className="w-2 h-2 fill-red-400" />
            {error}
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs">
          <div
            className={clsx(
              "w-1.5 h-1.5 rounded-full",
              provider?.type === "local-mlx"
                ? "bg-yellow-400"
                : "bg-green-400"
            )}
          />
          <span className="text-gray-500 hidden sm:inline">
            {provider?.type === "local-mlx" ? "Local" : "Cloud"}
          </span>
        </div>
      </div>
    </div>
  );
}

export function StopButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                 bg-red-500/10 text-red-400 border border-red-500/20
                 hover:bg-red-500/20 hover:border-red-500/30 transition-all"
    >
      <StopCircle className="w-3.5 h-3.5" />
      Stop
    </button>
  );
}

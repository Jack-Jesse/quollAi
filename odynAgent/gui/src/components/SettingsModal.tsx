"use client";

import { useStore } from "@/store/useStore";
import { X, Thermometer, Zap, Bot, RotateCcw } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";

export function SettingsModal() {
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const temperature = useStore((s) => s.temperature);
  const setTemperature = useStore((s) => s.setTemperature);
  const agentMode = useStore((s) => s.agentMode);
  const toggleAgentMode = useStore((s) => s.toggleAgentMode);
  const clearChat = useStore((s) => s.clearChat);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const providers = useStore((s) => s.providers);
  const provider = providers.find((p) => p.id === activeProviderId);

  const [tempValue, setTempValue] = useState(temperature);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setSettingsOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-surface-100 border border-surface-400/50 rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-400/50">
          <h2 className="text-lg font-semibold text-gray-100">Settings</h2>
          <button
            onClick={() => setSettingsOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-300 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-gray-400" />
                <label className="text-sm font-medium text-gray-200">
                  Temperature
                </label>
              </div>
              <span className="text-sm font-mono text-accent font-bold">
                {tempValue.toFixed(1)}
              </span>
            </div>

            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={tempValue}
              onChange={(e) => setTempValue(parseFloat(e.target.value))}
              onMouseUp={() => setTemperature(tempValue)}
              onTouchEnd={() => setTemperature(tempValue)}
              className="w-full h-1.5 rounded-full appearance-none bg-surface-400 cursor-pointer accent-accent-dark"
            />

            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-gray-600">Precise (0)</span>
              <span className="text-[10px] text-gray-600">
                Creative (2)
              </span>
            </div>
          </div>

          {/* Agent Mode */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              {agentMode ? (
                <Zap className="w-4 h-4 text-accent" />
              ) : (
                <Bot className="w-4 h-4 text-teal" />
              )}
              <label className="text-sm font-medium text-gray-200">
                Mode
              </label>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  if (!agentMode) return;
                  toggleAgentMode();
                }}
                className={clsx(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  !agentMode
                    ? "bg-teal/10 border-teal/25 text-teal"
                    : "bg-surface-200/60 border-surface-400/30 text-gray-500 hover:border-surface-400/60"
                )}
              >
                <Bot className="w-5 h-5" />
                <span className="text-xs font-medium">Chat</span>
                <span className="text-[10px] opacity-70">
                  No tools
                </span>
              </button>

              <button
                onClick={() => {
                  if (agentMode) return;
                  toggleAgentMode();
                }}
                className={clsx(
                  "flex flex-col items-center gap-2 p-3 rounded-xl border transition-all",
                  agentMode
                    ? "bg-accent-dark/10 border-accent-dark/25 text-accent-light"
                    : "bg-surface-200/60 border-surface-400/30 text-gray-500 hover:border-surface-400/60"
                )}
              >
                <Zap className="w-5 h-5" />
                <span className="text-xs font-medium">Agent</span>
                <span className="text-[10px] opacity-70">
                  Tools enabled
                </span>
              </button>
            </div>
          </div>

          {/* Current Provider */}
          <div>
            <label className="text-sm font-medium text-gray-200 mb-2 block">
              Active Provider
            </label>
            <div className="p-3 rounded-xl bg-surface-200/60 border border-surface-400/30">
              <p className="text-sm text-gray-200">{provider?.name}</p>
              <p className="text-[10px] font-mono text-gray-500 mt-0.5">
                {provider?.model}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {provider?.baseUrl}
              </p>
            </div>
          </div>

          {/* Danger zone */}
          <div className="pt-4 border-t border-surface-400/50">
            <button
              onClick={() => {
                clearChat();
                setSettingsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                         bg-red-500/5 text-red-400 border border-red-500/15
                         hover:bg-red-500/10 hover:border-red-500/25 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Clear Chat History
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

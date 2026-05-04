"use client";

import { useStore } from "@/store/useStore";
import {
  Plus,
  MessageSquare,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Bot,
  Trash2,
  Zap,
} from "lucide-react";
import clsx from "clsx";

export function Sidebar() {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const agentMode = useStore((s) => s.agentMode);
  const sidebarOpen = useStore((s) => s.sidebarOpen);

  const newSession = useStore((s) => s.newSession);
  const loadSession = useStore((s) => s.loadSession);
  const deleteSession = useStore((s) => s.deleteSession);
  const setModelPickerOpen = useStore((s) => s.setModelPickerOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const setSidebarOpen = useStore((s) => s.setSidebarOpen);
  const toggleAgentMode = useStore((s) => s.toggleAgentMode);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const providers = useStore((s) => s.providers);
  const isGenerating = useStore((s) => s.isGenerating);

  const activeProvider = providers.find((p) => p.id === activeProviderId);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  return (
    <div className="h-full flex flex-col bg-surface-50/80 border-r border-surface-400/50 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-surface-400/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-dark to-teal flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-gray-100 tracking-tight">
              Odyn Agent
            </h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">
              Browser Edition
            </p>
          </div>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="p-1.5 rounded-md hover:bg-surface-300 text-gray-500 hover:text-gray-300 transition-colors"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 py-3">
        <button
          onClick={newSession}
          disabled={isGenerating}
          className={clsx(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg",
            "bg-surface-300/70 hover:bg-surface-400/70 border border-surface-400/50",
            "text-sm font-medium text-gray-300 hover:text-gray-100",
            "transition-all duration-150",
            "disabled:opacity-40 disabled:cursor-not-allowed"
          )}
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Mode Toggle */}
      <div className="px-3 pb-2">
        <button
          onClick={toggleAgentMode}
          disabled={isGenerating}
          className={clsx(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-all duration-150",
            agentMode
              ? "bg-accent-dark/15 text-accent-light border border-accent-dark/25"
              : "bg-surface-200 text-gray-400 border border-surface-400/30 hover:text-gray-200"
          )}
        >
          {agentMode ? (
            <Zap className="w-3.5 h-3.5" />
          ) : (
            <Bot className="w-3.5 h-3.5" />
          )}
          <span className="font-medium">
            {agentMode ? "🤖 Agent Mode" : "💬 Chat Mode"}
          </span>
          {agentMode && (
            <span className="ml-auto text-[10px] bg-accent-dark/20 px-1.5 py-0.5 rounded">
              ON
            </span>
          )}
        </button>
      </div>

      {/* Current Model */}
      <div className="px-3 pb-2">
        <button
          onClick={() => setModelPickerOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs bg-surface-200/50 border border-surface-400/30 hover:border-surface-400/60 text-gray-400 hover:text-gray-200 transition-all"
        >
          <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
          <span className="truncate font-mono">
            {activeProvider?.model || "No model"}
          </span>
        </button>
      </div>

      {/* Sessions */}
      <div className="flex-1 overflow-y-auto px-3 py-1">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-2">
            <MessageSquare className="w-8 h-8 text-surface-500 mb-2" />
            <p className="text-xs text-gray-500">No conversations yet</p>
            <p className="text-[10px] text-gray-600 mt-1">
              Start a chat to begin
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={clsx(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all duration-100",
                  activeSessionId === session.id
                    ? "bg-surface-300/70 text-gray-100"
                    : "text-gray-400 hover:bg-surface-200/70 hover:text-gray-200"
                )}
                onClick={() => loadSession(session.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{session.title}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">
                    {formatTime(session.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-surface-400/50 text-gray-500 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="px-3 py-3 border-t border-surface-400/50 space-y-1">
        <button
          onClick={() => setModelPickerOpen(true)}
          className="sidebar-btn"
        >
          <Sparkles className="w-4 h-4" />
          <span>Model Picker</span>
        </button>
        <button onClick={() => setSettingsOpen(true)} className="sidebar-btn">
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="sidebar-btn"
          >
            <PanelLeftOpen className="w-4 h-4" />
            <span>Show Sidebar</span>
          </button>
        )}
      </div>
    </div>
  );
}

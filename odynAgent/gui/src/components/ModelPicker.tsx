"use client";

import { useState } from "react";
import { useStore } from "@/store/useStore";
import { MLX_PRESETS } from "@/lib/types";
import type { Provider } from "@/lib/types";
import {
  X,
  Check,
  Plus,
  Cpu,
  Cloud,
  Globe,
  Trash2,
  ChevronRight,
} from "lucide-react";
import clsx from "clsx";

export function ModelPicker() {
  const providers = useStore((s) => s.providers);
  const activeProviderId = useStore((s) => s.activeProviderId);
  const setActiveProvider = useStore((s) => s.setActiveProvider);
  const addProvider = useStore((s) => s.addProvider);
  const removeProvider = useStore((s) => s.removeProvider);
  const setModelPickerOpen = useStore((s) => s.setModelPickerOpen);

  const [tab, setTab] = useState<"active" | "presets" | "custom">("active");
  const [newName, setNewName] = useState("");
  const [newBaseUrl, setNewBaseUrl] = useState("");
  const [newModel, setNewModel] = useState("");
  const [newApiKey, setNewApiKey] = useState("");

  const handleSelect = (id: string) => {
    setActiveProvider(id);
    setModelPickerOpen(false);
  };

  const handleAddPreset = (preset: (typeof MLX_PRESETS)[number]) => {
    const existing = providers.find((p) => p.model === preset.model);
    if (existing) {
      setActiveProvider(existing.id);
      setModelPickerOpen(false);
      return;
    }
    const newProvider: Provider = {
      id: `preset-${Date.now()}`,
      name: preset.name,
      type: "local-mlx",
      baseUrl: "http://localhost:8080",
      model: preset.model,
      port: 8080,
    };
    addProvider(newProvider);
    setActiveProvider(newProvider.id);
    setModelPickerOpen(false);
  };

  const handleAddCustom = () => {
    if (!newName || !newBaseUrl || !newModel) return;
    const newProvider: Provider = {
      id: `custom-${Date.now()}`,
      name: newName,
      type: newBaseUrl.includes("localhost") ? "local-api" : "cloud-api",
      baseUrl: newBaseUrl.replace(/\/+$/, ""),
      model: newModel,
      apiKey: newApiKey || undefined,
    };
    addProvider(newProvider);
    setActiveProvider(newProvider.id);
    setModelPickerOpen(false);
    setNewName("");
    setNewBaseUrl("");
    setNewModel("");
    setNewApiKey("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setModelPickerOpen(false)}
      />

      {/* Modal */}
      <div className="relative w-full max-w-xl mx-4 bg-surface-100 border border-surface-400/50 rounded-2xl shadow-2xl animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-400/50">
          <h2 className="text-lg font-semibold text-gray-100">
            Select Model
          </h2>
          <button
            onClick={() => setModelPickerOpen(false)}
            className="p-1.5 rounded-lg hover:bg-surface-300 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-surface-400/50">
          {(["active", "presets", "custom"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 px-4 py-2.5 text-xs font-medium capitalize transition-colors relative",
                tab === t
                  ? "text-gray-100"
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              {t === "active" ? "My Models" : t === "presets" ? "MLX Presets" : "Add Custom"}
              {tab === t && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto p-4">
          {/* Active providers */}
          {tab === "active" && (
            <div className="space-y-2">
              {providers.map((provider) => (
                <div
                  key={provider.id}
                  onClick={() => handleSelect(provider.id)}
                  className={clsx(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group",
                    activeProviderId === provider.id
                      ? "bg-accent-dark/10 border border-accent-dark/25"
                      : "bg-surface-200/60 border border-surface-400/30 hover:border-surface-400/60 hover:bg-surface-200"
                  )}
                >
                  <div className="shrink-0">
                    {provider.type === "local-mlx" ? (
                      <Cpu className="w-4 h-4 text-amber-400" />
                    ) : provider.type === "local-api" ? (
                      <Globe className="w-4 h-4 text-cyan-400" />
                    ) : (
                      <Cloud className="w-4 h-4 text-blue-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {provider.name}
                    </p>
                    <p className="text-[10px] font-mono text-gray-500 truncate mt-0.5">
                      {provider.model}
                    </p>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={clsx(
                        "text-[10px] px-2 py-0.5 rounded-full",
                        provider.type === "local-mlx"
                          ? "bg-amber-400/10 text-amber-400 border border-amber-400/20"
                          : provider.type === "local-api"
                          ? "bg-cyan-400/10 text-cyan-400 border border-cyan-400/20"
                          : "bg-blue-400/10 text-blue-400 border border-blue-400/20"
                      )}
                    >
                      {provider.type}
                    </span>

                    {activeProviderId === provider.id && (
                      <Check className="w-4 h-4 text-accent" />
                    )}

                    {providers.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeProvider(provider.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-400/50 text-gray-500 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* MLX Presets */}
          {tab === "presets" && (
            <div className="space-y-2">
              {MLX_PRESETS.map((preset) => {
                const isAdded = providers.some(
                  (p) => p.model === preset.model
                );
                const isActive = providers.find(
                  (p) =>
                    p.model === preset.model &&
                    p.id === activeProviderId
                );

                return (
                  <div
                    key={preset.model}
                    onClick={() => handleAddPreset(preset)}
                    className={clsx(
                      "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all group",
                      isActive
                        ? "bg-accent-dark/10 border border-accent-dark/25"
                        : "bg-surface-200/60 border border-surface-400/30 hover:border-surface-400/60 hover:bg-surface-200"
                    )}
                  >
                    <Cpu className="w-4 h-4 text-amber-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-200">
                        {preset.name}
                      </p>
                      <p className="text-[10px] font-mono text-gray-500 truncate mt-0.5">
                        {preset.model}
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-surface-300/50 border border-surface-400/30">
                        {preset.size} · {preset.quant}
                      </span>
                      {isActive ? (
                        <Check className="w-4 h-4 text-accent" />
                      ) : isAdded ? (
                        <span className="text-[10px] text-gray-500">
                          Added
                        </span>
                      ) : (
                        <Plus className="w-4 h-4 text-gray-500 group-hover:text-accent transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Custom */}
          {tab === "custom" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Provider Name
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., GPT-4o, Claude 3.5"
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-400/50 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-dark/50 focus:ring-1 focus:ring-accent-dark/20"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Base URL
                </label>
                <input
                  type="text"
                  value={newBaseUrl}
                  onChange={(e) => setNewBaseUrl(e.target.value)}
                  placeholder="e.g., https://api.openai.com or http://localhost:8080"
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-400/50 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-dark/50 focus:ring-1 focus:ring-accent-dark/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  Model ID
                </label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g., gpt-4o, claude-3-5-sonnet-20241022"
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-400/50 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-dark/50 focus:ring-1 focus:ring-accent-dark/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1.5">
                  API Key{" "}
                  <span className="text-gray-600">(optional for local)</span>
                </label>
                <input
                  type="password"
                  value={newApiKey}
                  onChange={(e) => setNewApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-lg bg-surface-200 border border-surface-400/50 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-accent-dark/50 focus:ring-1 focus:ring-accent-dark/20 font-mono"
                />
              </div>

              <button
                onClick={handleAddCustom}
                disabled={!newName || !newBaseUrl || !newModel}
                className={clsx(
                  "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all",
                  newName && newBaseUrl && newModel
                    ? "bg-accent-dark text-white hover:bg-accent"
                    : "bg-surface-400/30 text-gray-600 cursor-not-allowed"
                )}
              >
                <Plus className="w-4 h-4" />
                Add Provider
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  Terminal,
  FileText,
  FileEdit,
  FolderOpen,
  Search,
  Globe,
  Code2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import clsx from "clsx";
import type { AgentStep } from "@/lib/types";

interface ToolCallCardProps {
  step: AgentStep;
}

const TOOL_CONFIG: Record<
  string,
  { icon: typeof Terminal; color: string; label: string }
> = {
  bash: { icon: Terminal, color: "text-green-400 bg-green-400/10 border-green-400/20", label: "Shell" },
  read_file: { icon: FileText, color: "text-blue-400 bg-blue-400/10 border-blue-400/20", label: "Read File" },
  write_file: { icon: FileEdit, color: "text-amber-400 bg-amber-400/10 border-amber-400/20", label: "Write File" },
  list_files: { icon: FolderOpen, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20", label: "List Files" },
  python: { icon: Code2, color: "text-purple-400 bg-purple-400/10 border-purple-400/20", label: "Python" },
  web_search: { icon: Search, color: "text-teal bg-teal/10 border-teal/20", label: "Web Search" },
  web_scrape: { icon: Globe, color: "text-orange-400 bg-orange-400/10 border-orange-400/20", label: "Web Scrape" },
};

export function ToolCallCard({ step }: ToolCallCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (step.type === "tool_call") {
    const name = step.toolCall?.name || "unknown";
    const config = TOOL_CONFIG[name] || {
      icon: Terminal,
      color: "text-gray-400 bg-gray-400/10 border-gray-400/20",
      label: name,
    };
    const Icon = config.icon;
    const args = step.toolCall?.arguments || {};

    // Format the args nicely
    const displayArgs = formatToolArgs(name, args);

    return (
      <div className="flex items-start gap-2 px-4 animate-slide-up">
        <div
          className={clsx(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono shrink-0",
            config.color
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          <span className="font-medium">{config.label}</span>
        </div>
        <div className="flex-1 min-w-0 text-xs font-mono text-gray-400 py-1.5 truncate">
          {displayArgs}
        </div>
        <Loader2 className="w-3.5 h-3.5 text-accent animate-spin shrink-0 mt-1.5" />
      </div>
    );
  }

  if (step.type === "tool_result") {
    const isError = step.toolResult?.isError ?? false;
    const content = step.content || "(no output)";

    return (
      <div className="flex items-start gap-2 px-4 animate-slide-up">
        <div
          className={clsx(
            "flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-mono shrink-0",
            isError
              ? "text-red-400 bg-red-400/10 border-red-400/20"
              : "text-green-400 bg-green-400/10 border-green-400/20"
          )}
        >
          {isError ? (
            <XCircle className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          <span>{isError ? "Error" : "Done"}</span>
        </div>

        <div className="flex-1 min-w-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors group"
          >
            {expanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            <span className="truncate font-mono max-w-[300px]">
              {content.split("\n")[0].slice(0, 80)}
            </span>
          </button>

          {expanded && (
            <pre className="mt-2 p-3 bg-surface-50 border border-surface-400/50 rounded-lg text-xs font-mono text-gray-400 overflow-x-auto max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words animate-fade-in">
              {content}
            </pre>
          )}
        </div>
      </div>
    );
  }

  if (step.type === "error") {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 animate-slide-up">
        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
        <span className="text-xs text-red-400 font-mono">
          {step.content}
        </span>
      </div>
    );
  }

  if (step.type === "auto_step") {
    return (
      <div className="flex items-center gap-2 px-4 py-1.5 animate-slide-up">
        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
        <span className="text-xs text-amber-400/80 font-mono">
          {step.content}
        </span>
      </div>
    );
  }

  return null;
}

function formatToolArgs(
  name: string,
  args: Record<string, unknown>
): string {
  switch (name) {
    case "bash":
      return String(args.command || args.cmd || "");
    case "read_file":
      return String(args.path || "");
    case "write_file":
      return `${args.path || ""} (${String(args.content || "").length} bytes)`;
    case "list_files":
      return String(args.path || args.dir || ".");
    case "python": {
      const code = String(args.code || "");
      const firstLine = code.split("\n")[0]?.trim() || "";
      return firstLine.length > 60 ? firstLine.slice(0, 60) + "..." : firstLine;
    }
    case "web_search":
      return `"${String(args.query || args.q || "")}"`;
    case "web_scrape":
      return String(args.url || "");
    default:
      return JSON.stringify(args).slice(0, 60);
  }
}

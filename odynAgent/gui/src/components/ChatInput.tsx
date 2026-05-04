"use client";

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { Send, Square, ArrowUp } from "lucide-react";
import clsx from "clsx";
import { useStore } from "@/store/useStore";

export function ChatInput() {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isGenerating = useStore((s) => s.isGenerating);
  const messages = useStore((s) => s.messages);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
  }, [input]);

  // Focus on mount and after messages
  useEffect(() => {
    if (!isGenerating) {
      textareaRef.current?.focus();
    }
  }, [isGenerating, messages.length]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGenerating) return;

    useStore.getState().sendMessage(trimmed);
    setInput("");

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [input, isGenerating]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  // Show last user message as "edit" option
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");

  return (
    <div className="shrink-0 border-t border-surface-400/50 bg-surface-50/40 backdrop-blur-sm">
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="relative flex items-end gap-2 bg-surface-200 border border-surface-400/50 rounded-2xl px-4 py-2 focus-within:border-accent-dark/40 focus-within:ring-1 focus-within:ring-accent-dark/20 transition-all">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message Odyn..."
            disabled={isGenerating}
            rows={1}
            className={clsx(
              "flex-1 resize-none bg-transparent text-sm text-gray-200 placeholder-gray-500",
              "focus:outline-none py-1.5",
              "disabled:opacity-40",
              "max-h-[200px]"
            )}
          />

          {/* Send / Stop button */}
          <div className="shrink-0 pb-0.5">
            {isGenerating ? (
              <StopButton />
            ) : (
              <SendButton
                onClick={handleSubmit}
                disabled={!input.trim()}
              />
            )}
          </div>
        </div>

        {/* Bottom hint */}
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-[10px] text-gray-600">
            Enter to send · Shift+Enter for new line
          </p>
          <p className="text-[10px] text-gray-600">
            {useStore.getState().agentMode ? "🤖 Agent" : "💬 Chat"} ·{" "}
            {useStore.getState().temperature}°
          </p>
        </div>
      </div>
    </div>
  );
}

function SendButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-150",
        disabled
          ? "bg-surface-400/30 text-gray-600 cursor-not-allowed"
          : "bg-accent-dark text-white hover:bg-accent shadow-md shadow-accent-dark/20"
      )}
    >
      <ArrowUp className="w-4 h-4" />
    </button>
  );
}

function StopButton() {
  const stop = useStore((s) => {
    // Access stop through the hook returned by the parent
    return s.setGenerating;
  });

  const handleStop = () => {
    // Dispatch a custom event for the parent to catch
    useStore.getState().setGenerating(false);
  };

  return (
    <button
      onClick={handleStop}
      className="flex items-center justify-center w-8 h-8 rounded-xl bg-red-500/80 text-white hover:bg-red-500 transition-all duration-150 shadow-md shadow-red-500/20"
    >
      <Square className="w-3 h-3 fill-current" />
    </button>
  );
}

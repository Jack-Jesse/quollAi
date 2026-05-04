"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import { User, Sparkles, Copy, Check } from "lucide-react";
import { useState, useCallback } from "react";
import type { ChatMessage } from "@/lib/types";

interface MessageBubbleProps {
  message: ChatMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isSystem = message.role === "system";
  const [copied, setCopied] = useState(false);

  const copyContent = useCallback(() => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [message.content]);

  if (isSystem) return null;

  return (
    <div
      className={clsx(
        "flex gap-3 animate-fade-in px-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent-dark to-teal/80 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      )}

      {/* Bubble */}
      <div
        className={clsx(
          "group relative max-w-[75%] min-w-0",
          isUser ? "order-first" : ""
        )}
      >
        {isUser ? (
          <div className="msg-user px-4 py-2.5">
            <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">
              {message.content}
            </p>
          </div>
        ) : (
          <div className="msg-assistant px-4 py-3">
            {message.content ? (
              <div className="markdown-body text-sm text-gray-300">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    pre: ({ children, ...props }) => (
                      <div className="relative group/code my-3">
                        <pre
                          className="!bg-surface-50 !border-surface-400/50 rounded-lg overflow-x-auto p-4"
                          {...props}
                        >
                          {children}
                        </pre>
                        <button
                          onClick={() => {
                            const code = extractCodeFromChildren(children);
                            navigator.clipboard.writeText(code);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-surface-300/80 hover:bg-surface-400 text-gray-400 hover:text-gray-200 opacity-0 group-hover/code:opacity-100 transition-all"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ),
                    code: ({ className, children, ...props }) => {
                      const isBlock = className?.includes("language-");
                      if (isBlock) {
                        return (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code
                          className="bg-surface-300 px-1.5 py-0.5 rounded text-teal-light text-[0.85em]"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : message.isStreaming ? (
              <div className="flex items-center gap-1.5 text-sm text-gray-400">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-accent/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Copy button on hover */}
        {!isUser && message.content && !message.isStreaming && (
          <button
            onClick={copyContent}
            className="absolute -bottom-1 right-2 translate-y-full p-1 rounded-md
                       bg-surface-300 hover:bg-surface-400 text-gray-500 hover:text-gray-300
                       opacity-0 group-hover:opacity-100 transition-all"
          >
            {copied ? (
              <Check className="w-3 h-3 text-green-400" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="shrink-0 mt-0.5">
          <div className="w-7 h-7 rounded-lg bg-surface-300 border border-surface-400/50 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-gray-400" />
          </div>
        </div>
      )}
    </div>
  );
}

function extractCodeFromChildren(children: React.ReactNode): string {
  if (typeof children === "string") return children;
  if (Array.isArray(children)) return children.map(extractCodeFromChildren).join("");
  if (children && typeof children === "object" && "props" in children) {
    return extractCodeFromChildren((children as any).props.children);
  }
  return "";
}

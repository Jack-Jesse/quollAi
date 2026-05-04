"use client";

import { useStore } from "@/store/useStore";
import { CheckCircle2, Circle, Zap } from "lucide-react";
import clsx from "clsx";

export function TodoBar() {
  const steps = useStore((s) => s.steps);
  const isGenerating = useStore((s) => s.isGenerating);

  // Find latest todo_update steps
  const todoSteps = steps.filter(
    (s) => s.type === "todo_update" && s.todoItems
  );
  const latestTodo =
    todoSteps.length > 0
      ? todoSteps[todoSteps.length - 1].todoItems
      : null;

  if (!latestTodo || latestTodo.length === 0) return null;

  const done = latestTodo.filter((t) => t.done).length;
  const total = latestTodo.length;
  const allDone = done === total;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const currentIdx = latestTodo.findIndex((t) => !t.done);
  const currentTask =
    currentIdx >= 0 ? latestTodo[currentIdx] : null;

  return (
    <div
      className={clsx(
        "shrink-0 mx-4 mb-2 px-4 py-3 rounded-xl border animate-slide-up",
        allDone
          ? "bg-green-500/5 border-green-500/20"
          : "bg-accent-dark/5 border-accent-dark/15"
      )}
    >
      {/* Progress bar */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {allDone ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <Zap className="w-4 h-4 text-accent" />
          )}
          <span
            className={clsx(
              "text-xs font-semibold",
              allDone ? "text-green-400" : "text-accent-light"
            )}
          >
            {allDone ? "All tasks completed" : "Working on tasks"}
          </span>
        </div>
        <span
          className={clsx(
            "text-xs font-mono font-bold",
            allDone ? "text-green-400" : "text-accent"
          )}
        >
          {done}/{total} · {pct}%
        </span>
      </div>

      {/* Progress track */}
      <div className="h-1.5 bg-surface-400/50 rounded-full overflow-hidden mb-2">
        <div
          className={clsx(
            "h-full rounded-full transition-all duration-500 ease-out",
            allDone
              ? "bg-green-400"
              : "bg-gradient-to-r from-accent-dark to-teal"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Task list (compact) */}
      <div className="space-y-0.5">
        {latestTodo.slice(0, 5).map((item, i) => {
          const isCurrent = i === currentIdx;
          return (
            <div
              key={i}
              className={clsx(
                "flex items-center gap-2 text-xs transition-all",
                item.done ? "text-green-400/60" : "",
                isCurrent && !item.done ? "text-accent-light" : "",
                !isCurrent && !item.done ? "text-gray-500" : ""
              )}
            >
              {item.done ? (
                <CheckCircle2 className="w-3 h-3 shrink-0 text-green-400/60" />
              ) : isCurrent ? (
                <div className="w-3 h-3 rounded-full border-2 border-accent shrink-0 flex items-center justify-center">
                  {isGenerating && (
                    <div className="w-1 h-1 rounded-full bg-accent animate-pulse" />
                  )}
                </div>
              ) : (
                <Circle className="w-3 h-3 shrink-0 text-gray-600" />
              )}
              <span
                className={clsx(
                  "truncate",
                  item.done && "line-through"
                )}
              >
                {item.text}
              </span>
            </div>
          );
        })}
        {latestTodo.length > 5 && (
          <span className="text-[10px] text-gray-600">
            +{latestTodo.length - 5} more
          </span>
        )}
      </div>
    </div>
  );
}

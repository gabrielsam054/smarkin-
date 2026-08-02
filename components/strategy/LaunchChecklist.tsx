"use client";

import { useState } from "react";
import { CheckSquare, Square, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChecklistItem } from "@/lib/strategy";

interface LaunchChecklistProps {
  initialItems: ChecklistItem[];
}

export function LaunchChecklist({ initialItems }: LaunchChecklistProps) {
  const [items, setItems] = useState(initialItems);

  const toggle = (id: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const checked  = items.filter((i) => i.checked).length;
  const required = items.filter((i) => i.required).length;
  const reqDone  = items.filter((i) => i.required && i.checked).length;
  const pct      = Math.round((checked / items.length) * 100);

  const categories = [...new Set(items.map((i) => i.category))];

  return (
    <div className="space-y-5">
      {/* Progress */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm font-medium text-text-primary">Launch Readiness</span>
            <span className="font-mono text-sm font-bold text-primary">{pct}%</span>
          </div>
          <div className="h-2 bg-surface-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <div className="text-right flex-none">
          <p className="font-mono text-xs text-primary font-bold">{checked}/{items.length}</p>
          <p className="font-mono text-[9px] text-text-muted">completed</p>
        </div>
      </div>

      {reqDone < required && (
        <div className="flex items-center gap-2 bg-amber/10 border border-amber/25 rounded-sm px-4 py-3">
          <AlertCircle size={14} className="text-amber flex-none" />
          <p className="text-xs text-amber">
            {required - reqDone} required item{required - reqDone > 1 ? "s" : ""} remaining before launch
          </p>
        </div>
      )}

      {/* Items by category */}
      {categories.map((cat) => (
        <div key={cat}>
          <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted mb-2">{cat}</p>
          <div className="space-y-1.5">
            {items.filter((i) => i.category === cat).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggle(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-sm border text-left transition-all duration-150",
                  item.checked
                    ? "bg-primary/5 border-primary/25"
                    : "bg-[#0B1120] border-border hover:border-border-strong"
                )}
              >
                {item.checked
                  ? <CheckSquare size={16} className="text-primary flex-none" />
                  : <Square size={16} className="text-text-muted flex-none" />
                }
                <span className={cn("text-sm flex-1", item.checked ? "text-text-secondary line-through" : "text-text-primary")}>
                  {item.item}
                </span>
                {item.required && !item.checked && (
                  <span className="font-mono text-[8px] uppercase tracking-wider text-amber border border-amber/30 bg-amber/10 px-1.5 py-0.5 rounded-full flex-none">
                    Required
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

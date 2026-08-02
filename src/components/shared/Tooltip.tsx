"use client";

import { useState, useId } from "react";

/**
 * First real consumer: the Business Intelligence page's truncated text
 * fields (functionalDescription, customerProblem, customerGoals) — these
 * are genuine, sometimes-long strings from ProductProfile that get
 * line-clamped in a compact card; hovering reveals the full text. Built
 * alongside that actual need, not speculatively ahead of one.
 */
export function Tooltip({ content, children }: { content: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined} tabIndex={0} className="cursor-help">
        {children}
      </span>
      {visible && (
        <span
          id={id}
          role="tooltip"
          className="absolute z-[1600] bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs px-3 py-2 rounded-md bg-surface-3 border border-border-strong text-xs text-text-primary shadow-card-hover"
        >
          {content}
        </span>
      )}
    </span>
  );
}

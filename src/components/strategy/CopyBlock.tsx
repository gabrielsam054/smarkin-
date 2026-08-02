"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopyBlockProps {
  label?: string;
  text: string;
  mono?: boolean;
  maxLength?: number;
  className?: string;
}

export function CopyBlock({ label, text, mono, maxLength, className }: CopyBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative group bg-[#F8FAFC] border border-border rounded-sm", className)}>
      {label && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <p className="font-mono text-[9px] uppercase tracking-[2px] text-text-muted">{label}</p>
          {maxLength && (
            <p className="font-mono text-[9px] text-text-muted">{maxLength} chars</p>
          )}
        </div>
      )}
      <div className="px-4 py-3 pr-12">
        <p className={cn(
          "text-text-primary leading-relaxed whitespace-pre-wrap",
          mono ? "font-mono text-xs" : "text-sm"
        )}>
          {text}
        </p>
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="absolute top-3 right-3 p-1.5 rounded-sm bg-surface border border-border opacity-0 group-hover:opacity-100 transition-all hover:border-primary hover:text-primary text-text-muted"
        title="Copy to clipboard"
      >
        {copied ? <Check size={12} className="text-primary" /> : <Copy size={12} />}
      </button>
    </div>
  );
}

export function CopyChip({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="group flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] border border-border rounded-sm hover:border-primary transition-colors text-left"
    >
      <span className="text-sm text-text-primary flex-1">{label ?? text}</span>
      {copied
        ? <Check size={12} className="text-primary flex-none" />
        : <Copy size={12} className="text-text-muted group-hover:text-primary flex-none transition-colors" />
      }
    </button>
  );
}

import { cn } from "@/lib/utils";

interface DividerProps {
  label?: string;
  className?: string;
}

export function Divider({ label, className }: DividerProps) {
  return (
    <div className={cn("flex items-center gap-3 my-6", className)}>
      <div className="flex-1 h-px bg-border" />
      {label && (
        <span className="text-xs text-text-muted font-mono uppercase tracking-widest px-1">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

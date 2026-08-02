import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 font-mono text-xs tracking-[3px] uppercase text-primary mb-5",
        className
      )}
    >
      <span className="block h-px w-8 bg-primary/50" />
      {children}
      <span className="block h-px w-8 bg-primary/50" />
    </div>
  );
}

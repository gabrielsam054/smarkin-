import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import * as React from "react";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-[3px] rounded-full border select-none",
  {
    variants: {
      variant: {
        green:       "bg-primary/10 text-primary border-primary/30",
        blue:        "bg-secondary/10 text-secondary border-secondary/25",
        amber:       "bg-amber/10 text-amber border-amber/25",
        pink:        "bg-pink/10 text-pink border-pink/25",
        purple:      "bg-purple/10 text-purple border-purple/25",
        orange:      "bg-orange/10 text-orange border-orange/25",
        muted:       "bg-surface-2 text-text-secondary border-border",
        destructive: "bg-destructive/10 text-destructive border-destructive/25",
      },
    },
    defaultVariants: { variant: "green" },
  }
);

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current flex-none" />}
      {children}
    </span>
  );
}

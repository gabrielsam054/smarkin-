import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  // Per the design-eng skill: specify exact transitioned properties
  // (never `transition-all`), use the strong custom ease-out curve,
  // and give every button real press feedback via scale — previously
  // missing entirely; only the primary variant reset a hover lift on
  // press, nothing scaled down to confirm the interface "heard" the click.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-tight transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40 cursor-pointer select-none active:scale-[0.97]",
  {
    variants: {
      variant: {
        primary:     "bg-primary text-primary-foreground rounded-full shadow-green-btn hover:bg-primary-dim hover:-translate-y-px active:translate-y-0",
        secondary:   "bg-surface text-text-primary border border-border-strong rounded-full hover:bg-surface-2 hover:border-text-muted",
        ghost:       "bg-transparent text-text-secondary border border-border rounded-lg hover:bg-surface-2 hover:text-text-primary hover:border-border-strong",
        "ghost-green":"bg-primary/8 text-primary border border-border-green rounded-lg hover:bg-primary/15",
        destructive: "bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/85",
        outline:     "bg-transparent text-text-primary border border-border rounded-lg hover:bg-surface-2 hover:border-border-strong",
        link:        "text-primary underline-offset-4 hover:underline p-0 h-auto font-medium active:scale-100",
      },
      size: {
        xs: "h-7  px-3   text-xs  rounded-md",
        sm: "h-9  px-4   text-xs",
        md: "h-10 px-5   text-sm",
        lg: "h-11 px-6   text-[15px]",
        xl: "h-13 px-8   text-base",
        icon:    "h-9 w-9 p-0",
        "icon-sm":"h-8 w-8 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} disabled={disabled || loading} {...props}>
        {loading ? (
          <>
            <svg className="h-[1em] w-[1em] animate-spin flex-none" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Loading…
          </>
        ) : children}
      </Comp>
    );
  }
);
Button.displayName = "Button";
export { Button, buttonVariants };

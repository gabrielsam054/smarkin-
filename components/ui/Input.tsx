import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, type = "text", ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary">
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            "w-full bg-surface-2 border text-text-primary placeholder:text-text-muted",
            "rounded-xl px-4 py-3 text-sm transition-all duration-150",
            "focus:outline-none focus:bg-surface-3",
            error
              ? "border-destructive/50 focus:border-destructive focus:shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
              : "border-border hover:border-border-strong focus:border-primary focus:shadow-focus",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
        {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
export { Input };

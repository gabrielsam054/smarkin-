import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={cn(
              "w-full appearance-none bg-surface-2 border text-text-primary",
              "rounded-xl px-4 py-3 pr-10 text-sm transition-all duration-150 cursor-pointer",
              "focus:outline-none focus:bg-surface-3",
              error
                ? "border-destructive/50 focus:border-destructive"
                : "border-border hover:border-border-strong focus:border-primary focus:shadow-focus",
              className
            )}
            {...props}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value} className="bg-surface-2">{o.label}</option>
            ))}
          </select>
          <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
        {error && <p className="text-xs text-destructive font-medium">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
export { Select };

import { SectionLabel } from "@/components/ui/SectionLabel";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  label?: string;
  title: string;
  subtitle?: string;
  className?: string;
  align?: "center" | "left";
}

export function PageHeader({
  label,
  title,
  subtitle,
  className,
  align = "center",
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "pt-32 pb-16",
        align === "center" && "text-center",
        className
      )}
    >
      <div className={cn(align === "center" && "flex justify-center")}>
        {label && <SectionLabel>{label}</SectionLabel>}
      </div>
      <h1 className="mt-2 text-4xl lg:text-6xl font-heading font-bold text-text-primary tracking-tight text-balance">
        {title}
      </h1>
      {subtitle && (
        <p
          className={cn(
            "mt-4 text-lg text-text-secondary",
            align === "center" && "max-w-2xl mx-auto"
          )}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

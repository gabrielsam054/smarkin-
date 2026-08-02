import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-sm bg-surface-2",
        className
      )}
    />
  );
}

export function ReportSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="bg-surface border border-border rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-64" />
            <div className="flex gap-2">
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-40 w-40 rounded-full" />
        </div>
      </div>

      {/* Score strip skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-surface border border-border rounded-sm px-4 py-3 space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>

      {/* Section skeletons */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-6 w-6 rounded-sm" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="bg-[#0B1120] border border-border rounded-sm p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-1 w-full rounded-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProcessingState() {
  return (
    <div className="space-y-6">
      <div className="bg-surface border border-primary/20 rounded-2xl p-10 text-center">
        <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6 relative">
          <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        <h2 className="text-2xl font-heading font-bold text-text-primary mb-2">
          Generating Audience Intelligence
        </h2>
        <p className="text-text-secondary text-sm mb-8 max-w-md mx-auto">
          The Smarkin AI engine is cross-referencing your product against the keyword database,
          matching personas, and verifying interests and behaviors.
        </p>

        {/* Animated progress steps */}
        <div className="max-w-sm mx-auto space-y-3 text-left">
          {[
            "Extracting product keywords",
            "Matching to industry database",
            "Identifying customer personas",
            "Verifying Meta interests",
            "Matching behaviors",
            "Calculating confidence score",
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3" style={{ animationDelay: `${i * 200}ms` }}>
              <div className="w-5 h-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-none">
                <div
                  className="w-2 h-2 rounded-full bg-primary animate-pulse"
                  style={{ animationDelay: `${i * 300}ms` }}
                />
              </div>
              <span className="text-sm text-text-secondary">{step}</span>
            </div>
          ))}
        </div>
      </div>
      <ReportSkeleton />
    </div>
  );
}

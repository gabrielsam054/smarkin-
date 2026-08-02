import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { ReportsList, ReportEntry } from "@/components/reports/ReportsList";

/**
 * Reconstructed self-contained per the same lesson from earlier in this
 * project: no imports beyond AppShell + lib/admin + supabase/server +
 * next/lucide, since a prior version broke the build by assuming shared
 * components existed in the repo that hadn't actually landed.
 *
 * New this feature: FilterBar/sort-by-confidence (client-side, via
 * ReportsList) and archived-business exclusion.
 *
 * The archived-business query is defensive by necessity, not by
 * caution alone: business_profiles + archived_at depend on migrations
 * that — per the preflight check earlier in this project — have not
 * been deployed to the live database yet. If the table doesn't exist,
 * Supabase's client returns an error object rather than throwing, so
 * this degrades to "zero exclusions" cleanly rather than crashing the
 * page. Once those migrations land, this becomes active with no code
 * change needed here.
 */
export default async function ReportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: analyses }, { data: research }, { data: audiences }, { data: decisions }, isAdmin, archivedResult] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    supabase.from("analysis_requests")
      .select("id, product_name, status, created_at, objective")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("customer_research")
      .select("id, business_id, confidence, version_number, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("audience_research")
      .select("id, business_id, confidence, version_number, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("decision_requests")
      .select("id, industry, goal, status, created_at")
      .eq("user_id", user.id).order("created_at", { ascending: false }),
    isCurrentUserAdmin(),
    // Defensive: table may not exist yet in the live database (see note above).
    supabase.from("business_profiles").select("name").eq("user_id", user.id).not("archived_at", "is", null),
  ]);

  const archivedNames = new Set(
    (archivedResult.error ? [] : archivedResult.data ?? []).map((r: { name: string }) => r.name)
  );

  const firstName = profile?.first_name || user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const initials = firstName.charAt(0).toUpperCase();

  type AnalysisRow = { id: string; product_name: string; status: string; created_at: string; objective: string };
  type ResearchRow = { id: string; business_id: string; confidence: number; version_number: number; created_at: string };
  type DecisionRow = { id: string; industry: string; goal: string; status: string; created_at: string };

  const entries: ReportEntry[] = [
    ...((analyses ?? []) as AnalysisRow[])
      .filter((a) => !archivedNames.has(a.product_name))
      .map((a): ReportEntry => ({
        key: `an-${a.id}`, href: `/analysis/${a.id}`, title: a.product_name,
        typeLabel: a.objective === "Sales" ? "Audience Intelligence" : "Campaign Strategy",
        typeColor: "text-primary", type: "research", icon: "🎯", createdAt: a.created_at, status: a.status, confidence: null,
      })),
    ...((research ?? []) as ResearchRow[])
      .filter((r) => !archivedNames.has(r.business_id))
      .map((r): ReportEntry => ({
        key: `cr-${r.id}`, href: `/research/${r.id}`, title: r.business_id,
        typeLabel: `Customer Research · v${r.version_number}`,
        typeColor: "text-primary", type: "research", icon: "🧠", createdAt: r.created_at, status: "completed", confidence: r.confidence,
      })),
    ...((audiences ?? []) as ResearchRow[])
      .filter((a) => !archivedNames.has(a.business_id))
      .map((a): ReportEntry => ({
        key: `ar-${a.id}`, href: `/audience/${a.id}`, title: a.business_id,
        typeLabel: `Audience Research · v${a.version_number}`,
        typeColor: "text-secondary", type: "audience", icon: "📡", createdAt: a.created_at, status: "completed", confidence: a.confidence,
      })),
    ...((decisions ?? []) as DecisionRow[]).map((d): ReportEntry => ({
      key: `dc-${d.id}`, href: `/decision/${d.id}`, title: `${d.industry} — ${d.goal}`,
      typeLabel: "Advertising Decision",
      typeColor: "text-amber", type: "decision", icon: "🧭", createdAt: d.created_at, status: d.status, confidence: null,
    })),
  ];

  return (
    <AppShell
      firstName={firstName}
      initials={initials}
      isAdmin={!!isAdmin}
      activeLabel="Reports"
      headerRight={
        <Link href="/research/new"
          className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg px-3 py-2 hover:bg-primary-dim transition-colors">
          <Plus size={14} />
          <span className="hidden sm:inline">New Research</span>
          <span className="sm:hidden">New</span>
        </Link>
      }
    >
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Reports</h1>
          <p className="text-sm text-text-secondary mt-1">
            Every result from every capability — research, audiences, and decisions — in one place.
          </p>
        </div>

        <ReportsList entries={entries} />
      </div>
    </AppShell>
  );
}

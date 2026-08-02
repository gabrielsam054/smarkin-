import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Sparkles, Clock } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { CommandBar } from "@/components/ai/CommandBar";
import { ROUTABLE_CAPABILITIES } from "@/components/ai/commandRouter";
import { EmptyState } from "@/components/shared/EmptyState";

interface RecentTask {
  id: string;
  capability: "advertising" | "customer-research";
  label: string;
  detail: string;
  href: string;
  createdAt: string;
}

export default async function AiWorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: decisionResults }, { data: decisionRequests }, { data: research }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    supabase.from("decision_results").select("id, request_id, recommended_channel, channel_confidence, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("decision_requests").select("id, industry").eq("user_id", user.id),
    supabase.from("customer_research").select("id, business_id, confidence, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  // Merged in JS, not a nested Supabase join — matching every other query
  // in this codebase, which stays to simple single-table selects rather
  // than relying on a join syntax that can't be verified against a live
  // database from here.
  const requestsById = new Map<string, { id: string; industry: string }>(
    (decisionRequests ?? []).map((r: { id: string; industry: string }) => [r.id, r]),
  );
  const advertisingTasks: RecentTask[] = (decisionResults ?? []).map((r: { id: string; request_id: string; recommended_channel: string | null; channel_confidence: string | null; created_at: string }) => ({
    id: r.id,
    capability: "advertising" as const,
    label: requestsById.get(r.request_id)?.industry ?? "Advertising decision",
    detail: r.recommended_channel ? `${r.recommended_channel} · ${r.channel_confidence ?? "—"}` : "—",
    href: `/decision/${r.request_id}`,
    createdAt: r.created_at,
  }));
  const researchTasks: RecentTask[] = (research ?? []).map((r: { id: string; business_id: string; confidence: number; created_at: string }) => ({
    id: r.id,
    capability: "customer-research" as const,
    label: r.business_id,
    detail: `Confidence ${r.confidence}`,
    href: `/research/${r.id}`,
    createdAt: r.created_at,
  }));
  const recentTasks = [...advertisingTasks, ...researchTasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="AI Workspace">
      <div className="max-w-2xl mx-auto px-4 sm:px-8 py-10 flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-text-primary tracking-tight mb-2">Ask Smarkin anything</h1>
          <p className="text-sm text-text-secondary">
            Every request routes to a real, registered capability — never a generated chat reply.
          </p>
        </div>

        <CommandBar />

        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Suggested Workflows</p>
          <div className="grid sm:grid-cols-2 gap-3">
            {ROUTABLE_CAPABILITIES.map(cap => (
              <Link key={cap.capability} href={cap.route}
                className="card p-4 flex flex-col gap-2 hover:border-border-strong transition-colors group">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-text-primary">{cap.label}</p>
                  <ArrowRight size={14} className="text-text-muted group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-text-muted">e.g. &ldquo;{cap.examples[0]}&rdquo;</p>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">Recent AI Tasks</p>
          {recentTasks.length > 0 ? (
            <div className="card overflow-hidden">
              <div className="divide-y divide-border">
                {recentTasks.map(task => (
                  <Link key={`${task.capability}-${task.id}`} href={task.href}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2/60 transition-colors group">
                    <div className="w-8 h-8 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-none">
                      <Sparkles size={13} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-text-primary truncate group-hover:text-primary transition-colors">{task.label}</p>
                      <p className="text-xs text-text-muted truncate">{task.capability === "advertising" ? "Advertising" : "Customer Research"} · {task.detail}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-text-muted flex-none">
                      <Clock size={11} />
                      {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="card">
              <EmptyState
                icon={Sparkles}
                title="No AI tasks yet"
                description="Ask a question above, or pick a suggested workflow — it'll show up here once it runs."
              />
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

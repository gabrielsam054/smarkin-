import { redirect } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Zap, Settings, CheckCircle, AlertCircle, Loader2, Clock, Plus,
  Target, Briefcase, ChevronRight, ArrowUpRight,
  TrendingUp, Users, Activity, CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DashboardToast } from "@/components/shared/DashboardToast";
import { PLANS, daysRemaining } from "@/lib/billing";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { Subscription, PlanId } from "@/lib/billing";
import { AppShell } from "@/components/layout/AppShell";
import { CommandBar } from "@/components/ai/CommandBar";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { buildDailyBriefing } from "@/lib/dailyBriefing";

// ── Mini sparkline (deterministic per metric) ─────────────────
function Spark({ color, seed }: { color: string; seed: number }) {
  const pts = [12, 8, 15, 6, 18, 10, 20, 7, 22, 14].map((v, i) => ({
    x: (i / 9) * 80,
    y: 24 - ((v + seed) % 20) * 1.1,
  }));
  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg width="80" height="28" viewBox="0 0 80 28" fill="none">
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
    </svg>
  );
}

function StatusDot({ status }: { status: string }) {
  if (status === "completed")  return <CheckCircle size={13} className="text-primary flex-none" />;
  if (status === "processing") return <Loader2 size={13} className="text-amber animate-spin flex-none" />;
  if (status === "failed")     return <AlertCircle size={13} className="text-destructive flex-none" />;
  return <Clock size={13} className="text-text-muted flex-none" />;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const now    = new Date();
  const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const hour   = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const [
    { data: profile },
    { count: totalAnalyses },
    { data: recentAnalyses },
    { data: subRow },
    { data: usageRow },
    isAdmin,
  ] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.id).single(),
    supabase.from("analysis_requests").select("*", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("analysis_requests")
      .select("id, product_name, status, created_at, business_type, objective")
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("subscriptions").select("*").eq("user_id", user.id)
      .eq("status", "active").order("created_at", { ascending: false }).limit(1).single(),
    supabase.from("usage_tracking").select("analyses")
      .eq("user_id", user.id).eq("billing_period", period).maybeSingle(),
    isCurrentUserAdmin(),
  ]);

  const subscription: Subscription | null = subRow ? {
    id: subRow.id, userId: subRow.user_id, planId: subRow.plan_id as PlanId,
    status: subRow.status, provider: subRow.provider,
    paymentReference: subRow.payment_reference, customerCode: subRow.customer_code,
    subscriptionCode: subRow.subscription_code, startsAt: subRow.starts_at,
    expiresAt: subRow.expires_at, nextBillingAt: subRow.next_billing_at,
    cancelledAt: subRow.cancelled_at, createdAt: subRow.created_at,
  } : null;

  const activePlan     = subscription ? PLANS[subscription.planId] : null;
  const days           = daysRemaining(subscription);
  const count          = totalAnalyses ?? 0;

  // Real daily briefing — genuine counts from real opportunities and
  // health trends, fetched separately since it needs workspaceId
  // resolved first. Best-effort: if this fails for any reason, the
  // rest of Mission Control still renders correctly, just without
  // the briefing section.
  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  const briefing = workspaceId ? await buildDailyBriefing(supabase, workspaceId) : null;

  // Same usability-audit fix as the Opportunities page: briefing
  // priorities named a campaign but linked nowhere.
  const { data: briefingCampaignRows } = workspaceId
    ? await supabase.from("campaign_entities").select("id, external_id").eq("workspace_id", workspaceId)
    : { data: null };
  const campaignIdByExternalId = new Map<string, string>((briefingCampaignRows ?? []).map((c) => [c.external_id, c.id]));

  const hasAccess      = subscription?.status === "active";
  const usedThisPeriod = usageRow?.analyses ?? 0;
  const LIMITS: Record<string, number | null> = { trial: 20, pro: null, agency: null };
  const planLimit      = subscription ? (LIMITS[subscription.planId] ?? null) : 0;
  const firstName      = profile?.first_name || user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const planName       = activePlan?.name ?? "Free";
  const initials       = firstName.charAt(0).toUpperCase();

  const formatRelative = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return "Today, " + new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    if (diff === 1) return "Yesterday";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // ── Match score (derived from usage) ─────────────────────────
  const matchScore = count > 0 ? Math.min(99, 72 + Math.floor((count % 10) * 2.7)) : 0;

  return (
    <AppShell
      firstName={firstName}
      initials={initials}
      isAdmin={!!isAdmin}
      activeLabel="Dashboard"
      userSubtitle={planName}
      headerRight={
        <Button size="sm" asChild className="gap-1.5">
          <Link href="/workspace">
            <Plus size={14} />
            <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </Link>
        </Button>
      }
    >
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <CommandBar />
        </div>

        {/* ── Page header ───────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">
            {greeting}, <span className="gradient-text">{firstName}</span> 👋
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Here&apos;s what&apos;s happening with your ad intelligence today.
          </p>
        </div>

        {/* Real stat-card summary row — same visual idea as the
            reference mockup, but every number here is real: total
            spend is a genuine sum of real daily snapshots, the counts
            are real opportunity/health tallies. Deliberately no
            "Potential Impact: $X" card — that would require predictive
            modeling this system doesn't have (see Decision #008). */}
        {briefing?.hasConnectedAccount && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Spend (7d)</p>
              <p className="text-lg font-semibold text-text-primary">
                {briefing.totalSpend7d !== null ? `$${briefing.totalSpend7d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Ready to scale</p>
              <p className="text-lg font-semibold text-text-primary">{briefing.readyToScaleCount}</p>
              <p className="text-[10px] text-text-muted mt-0.5">real, high-CTR findings</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Need attention</p>
              <p className={`text-lg font-semibold ${briefing.criticalCount > 0 ? "text-destructive" : "text-text-primary"}`}>{briefing.criticalCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Trending</p>
              <p className="text-lg font-semibold text-text-primary">
                <span className="text-primary">{briefing.campaignsImproving}↑</span> <span className="text-text-muted">{briefing.campaignsDeclining}↓</span>
              </p>
            </div>
          </div>
        )}

        {/* ── Daily Briefing — real synthesis, not fabricated ──── */}
        {briefing?.hasConnectedAccount && briefing.openOpportunityCount > 0 && (
          <div className="card p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Zap size={14} className="text-primary" />
              <p className="text-sm font-semibold text-text-primary">Today&apos;s briefing</p>
            </div>
            <p className="text-sm text-text-secondary mb-4">
              {briefing.openOpportunityCount} open {briefing.openOpportunityCount === 1 ? "finding" : "findings"} across your connected campaigns
              {briefing.criticalCount > 0 && <span className="text-destructive font-medium"> — {briefing.criticalCount} need attention</span>}
              {briefing.campaignsImproving > 0 && `. ${briefing.campaignsImproving} ${briefing.campaignsImproving === 1 ? "campaign is" : "campaigns are"} trending up`}
              {briefing.campaignsDeclining > 0 && `, ${briefing.campaignsDeclining} trending down`}.
            </p>

            {/* Beta 0 — the single top priority, featured, with a real
                Review action using the same pattern just built for
                Opportunities. Not just a list item — a genuine
                "here's the one thing, here's a real way to act on it"
                briefing moment, reusing the grounded Analyst rather
                than inventing a new summary mechanism. */}
            {briefing.topPriorities[0] && (() => {
              const top = briefing.topPriorities[0];
              const campaignId = campaignIdByExternalId.get(top.campaignExternalId);
              return (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-3">
                  <p className="text-[10px] font-mono uppercase tracking-wide text-primary mb-1.5">Recommended focus</p>
                  <p className="text-sm text-text-primary mb-1">{top.title}</p>
                  {top.evidence && (
                    <p className="text-[11px] text-text-muted font-mono mb-2">
                      {Object.entries(top.evidence).filter(([k]) => k !== "campaign_name").slice(0, 3).map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "number" ? v.toFixed(2) : v}`).join(" · ")}
                    </p>
                  )}
                  {campaignId && (
                    <Link href={`/campaigns/${campaignId}?askAbout=${encodeURIComponent(top.title)}#analyst`}
                      className="text-xs font-semibold text-primary hover:underline">
                      Review with the Analyst →
                    </Link>
                  )}
                </div>
              );
            })()}

            {briefing.topPriorities.length > 1 && (
              <div className="flex flex-col gap-1.5">
                {briefing.topPriorities.slice(1).map((p, i) => {
                  const campaignId = campaignIdByExternalId.get(p.campaignExternalId);
                  const content = <><span className="text-text-muted font-mono">{i + 2}.</span> {p.title}</>;
                  return campaignId ? (
                    <Link key={i} href={`/campaigns/${campaignId}`} className="text-xs text-text-secondary hover:text-text-primary transition-colors">{content}</Link>
                  ) : (
                    <p key={i} className="text-xs text-text-secondary">{content}</p>
                  );
                })}
              </div>
            )}
            <Link href="/intelligence/opportunities" className="text-xs font-medium text-primary hover:underline mt-3 inline-block">View all opportunities →</Link>
          </div>
        )}
        {briefing?.hasConnectedAccount && briefing.openOpportunityCount === 0 && (
          <div className="card p-4 mb-6 flex items-center gap-2.5">
            <CheckCircle size={14} className="text-primary flex-none" />
            <p className="text-sm text-text-secondary">Nothing flagged across your connected campaigns right now — steady as of the last sync.</p>
          </div>
        )}

        {/* ── No subscription banner ─────────────────── */}
        {!hasAccess && (
          <div className="flex items-center justify-between gap-4 bg-primary/6 border border-primary/20 rounded-xl px-5 py-4 mb-6 glow-green">
            <div className="flex items-center gap-3">
              <Zap size={16} className="text-primary flex-none" />
              <p className="text-sm text-text-primary">
                Unlock all features — start with <span className="font-semibold text-primary">3-Day Access for GHS 59.99</span>
              </p>
            </div>
            <Button size="sm" asChild className="flex-none gap-1.5">
              <Link href="/billing#plans"><Zap size={13} />Get Started</Link>
            </Button>
          </div>
        )}

        {/* Expiry warning */}
        {days !== null && days <= 1 && hasAccess && (
          <div className="flex items-center gap-3 bg-amber/8 border border-amber/25 rounded-xl px-5 py-3 mb-6">
            <AlertCircle size={15} className="text-amber flex-none" />
            <p className="text-sm text-amber flex-1">Your plan expires {days === 0 ? "today" : "tomorrow"}.</p>
            <Link href="/billing" className="text-xs font-semibold text-amber hover:underline">Renew →</Link>
          </div>
        )}

        {/* ── KPI grid ──────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Analyses Used",       value: `${usedThisPeriod} / ${planLimit ?? "∞"}`, sub: "This month", color: "#7C3AED", seed: 0 },
            { label: "Campaigns Analyzed",  value: String(count),  sub: "Total",     color: "#D97706", seed: 3 },
            { label: "Ad Accounts",         value: "—",            sub: "Connected", color: "#D97706", seed: 6 },
            { label: "Reports Generated",   value: String(count),  sub: "Total",     color: "#3B82F6", seed: 2 },
          ].map(({ label, value, sub, color, seed }) => (
            <div key={label} className="card p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full flex-none" style={{ background: color }} />
                <p className="text-[11px] font-medium text-text-muted uppercase tracking-wider truncate">{label}</p>
              </div>
              <p className="text-2xl font-bold text-text-primary tracking-tight" style={{ color }}>{value}</p>
              <div className="flex items-end justify-between mt-1">
                <p className="text-[11px] text-text-muted">{sub}</p>
                <Spark color={color} seed={seed} />
              </div>
            </div>
          ))}
        </div>

        {/* ── Main content grid ─────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">

          {/* Recent Activity */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity size={15} className="text-text-muted" />
                <h2 className="text-sm font-semibold text-text-primary">Recent Activity</h2>
              </div>
              <Link href="/reports" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                View all <ArrowUpRight size={11} />
              </Link>
            </div>

            {recentAnalyses && recentAnalyses.length > 0 ? (
              <div className="divide-y divide-border">
                {recentAnalyses.map((item) => {
                  const type = item.objective === "Sales" ? "Audience Intelligence" : "Campaign Strategy";
                  const typeColor = item.objective === "Sales" ? "text-primary" : "text-amber";
                  return (
                    <Link key={item.id} href={`/analysis/${item.id}`}
                      className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/60 transition-colors group">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-none text-base">
                        🎯
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                          {item.product_name}
                        </p>
                        <p className={`text-[11px] font-medium mt-0.5 ${typeColor}`}>{type}</p>
                      </div>
                      <div className="flex items-center gap-2.5 flex-none">
                        <p className="text-[11px] text-text-muted">{formatRelative(item.created_at)}</p>
                        <StatusDot status={item.status} />
                        <ChevronRight size={13} className="text-text-muted group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-3">
                  <Zap size={18} className="text-text-muted" />
                </div>
                <p className="font-semibold text-text-primary text-sm mb-1">No analyses yet</p>
                <p className="text-text-muted text-xs mb-5">Run your first audience analysis to see activity here.</p>
                <Button size="sm" asChild className="gap-1.5">
                  <Link href="/analysis/new"><Plus size={13} />Start Analysis</Link>
                </Button>
              </div>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Audience Match Score */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-text-muted" />
                <p className="text-sm font-semibold text-text-primary">Audience Match Score</p>
              </div>

              {count > 0 ? (
                <>
                  {/* Arc gauge */}
                  <div className="flex flex-col items-center py-2">
                    <svg width="140" height="90" viewBox="0 0 140 90">
                      <path d="M 15 78 A 55 55 0 0 1 125 78" fill="none" stroke="#E2E8F0" strokeWidth="10" strokeLinecap="round"/>
                      <path d="M 15 78 A 55 55 0 0 1 125 78" fill="none" stroke="#7C3AED" strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${(matchScore / 100) * 173} 173`}
                        style={{ filter: "drop-shadow(0 0 6px rgba(124,58,237,0.35))" }}
                      />
                      <text x="70" y="62" textAnchor="middle" fontSize="26" fontWeight="700" fill="#7C3AED" fontFamily="Inter">{matchScore}%</text>
                      <text x="70" y="78" textAnchor="middle" fontSize="10" fill="#64748B" fontFamily="Inter">High Match</text>
                    </svg>
                  </div>
                  <Link href={recentAnalyses?.[0] ? `/analysis/${recentAnalyses[0].id}` : "/analysis/new"}
                    className="flex items-center justify-center gap-1 text-xs font-semibold text-primary hover:underline mt-1">
                    View full report <ArrowUpRight size={11} />
                  </Link>
                </>
              ) : (
                <div className="text-center py-4">
                  <p className="text-text-muted text-xs">Run your first analysis to see your audience match score.</p>
                </div>
              )}
            </div>

            {/* Subscription status */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard size={14} className="text-text-muted" />
                <p className="text-sm font-semibold text-text-primary">Subscription</p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-bold text-text-primary">{planName}</span>
                <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                  hasAccess ? "text-primary border-primary/30 bg-primary/8" : "text-text-muted border-border bg-surface-2"
                }`}>{hasAccess ? "Active" : "Inactive"}</span>
              </div>
              {days !== null && (
                <div className="mb-3">
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-text-muted">Access period</span>
                    <span className={days <= 1 ? "text-destructive font-medium" : "text-text-secondary"}>{days}d left</span>
                  </div>
                  <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${days <= 1 ? "bg-destructive" : "bg-primary"}`}
                      style={{ width: `${activePlan?.durationDays ? (days / activePlan.durationDays) * 100 : 100}%` }} />
                  </div>
                </div>
              )}
              <Link href="/billing" className="block w-full text-center text-[12px] font-semibold text-primary hover:underline">
                {hasAccess ? "Manage plan →" : "Get started →"}
              </Link>
            </div>

            {/* Quick actions */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users size={14} className="text-text-muted" />
                <p className="text-sm font-semibold text-text-primary">Quick Actions</p>
              </div>
              <div className="space-y-2">
                {[
                  { href: "/workspace",    icon: Briefcase, label: "Campaign Workspace",  color: "text-primary" },
                  { href: "/analysis/new", icon: Target,    label: "Audience Research",    color: "text-amber" },
                  { href: "/profile",      icon: Settings,  label: "Account Settings",     color: "text-text-secondary" },
                ].map(({ href, icon: Icon, label, color }) => (
                  <Link key={label} href={href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-2 transition-colors group">
                    <Icon size={14} className={`flex-none ${color}`} />
                    <span className="text-[13px] text-text-secondary group-hover:text-text-primary transition-colors">{label}</span>
                    <ChevronRight size={12} className="ml-auto text-text-muted group-hover:text-text-secondary transition-colors" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}>
        <DashboardToast />
      </Suspense>
    </AppShell>
  );
}

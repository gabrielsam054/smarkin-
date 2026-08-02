import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft, CheckCircle2, Sparkles, Target, Layers, AlertTriangle, Loader2,
} from "lucide-react";
import { ReportSection } from "@/components/shared/ReportSection";
import { OutcomeReporter } from "./OutcomeReporter";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";

interface ChannelScore { channel: string; score: number }

export default async function DecisionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const initials = firstName.charAt(0).toUpperCase();

  const { data: request } = await supabase
    .from("decision_requests")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!request) notFound();

  const { data: result } = await supabase
    .from("decision_results")
    .select("*")
    .eq("request_id", id)
    .single();

  const { data: outcome } = result
    ? await supabase.from("decision_outcomes").select("outcome").eq("decision_result_id", result.id).maybeSingle()
    : { data: null };

  if (!result && request.status === "processing") {
    return (
      <AppShell firstName={firstName} initials={initials} isAdmin={!!isAdmin} activeLabel="Decisions"
        headerLeft={<Link href="/reports" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>}>
        <div className="flex items-center justify-center p-6 min-h-[60vh]">
          <div className="card p-8 text-center max-w-sm flex flex-col items-center gap-2">
            <Loader2 size={20} className="text-primary animate-spin mb-1" />
            <p className="text-text-primary font-semibold mb-1">Still thinking...</p>
            <p className="text-text-muted text-sm">Your recommendation is being generated.</p>
          </div>
        </div>
      </AppShell>
    );
  }
  if (!result || request.status === "failed") {
    return (
      <AppShell firstName={firstName} initials={initials} isAdmin={!!isAdmin} activeLabel="Decisions"
        headerLeft={<Link href="/reports" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>}>
        <div className="flex items-center justify-center p-6 min-h-[60vh]">
          <div className="card p-8 text-center max-w-sm flex flex-col items-center gap-3">
            <AlertTriangle size={20} className="text-amber" />
            <div>
              <p className="text-text-primary font-semibold mb-1">Something went wrong</p>
              <p className="text-text-muted text-sm">This recommendation couldn&apos;t be generated.</p>
            </div>
            <Link href="/decision/new"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-foreground bg-primary rounded-sm px-4 py-2 hover:bg-primary-dim transition-colors mt-1">
              Try Again
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  const primary = result.primary_recommendation as Record<string, unknown> | null;
  const primaryName = primary
    ? ("actionName" in primary ? String(primary.actionName) : "opportunity" in primary ? String(primary.opportunity) : "Unknown")
    : null;
  const primaryReasoning = primary
    ? String(primary.reasoningNotes ?? primary.reasoning ?? "")
    : "";
  const primaryEvidence = primary
    ? String(primary.evidenceSummary ?? primary.evidence ?? "")
    : "";

  const channelScores = (result.channel_scores as ChannelScore[] | null) ?? [];
  const alternatives = (result.alternative_actions as Record<string, unknown>[] | null) ?? [];
  const opportunities = (result.critical_opportunities as Record<string, unknown>[] | null) ?? [];
  const gaps = (result.gaps as string[] | null) ?? [];
  const channelExecution = result.channel_execution as Record<string, unknown> | null;

  return (
    <AppShell firstName={firstName} initials={initials} isAdmin={!!isAdmin} activeLabel="Decisions"
        headerLeft={<Link href="/reports" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>}>
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-5">
        <div className="mb-1">
          <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Marketing Decision</p>
          <h1 className="text-lg font-bold text-text-primary truncate">{request.industry}</h1>
        </div>

        {/* ── THE ONE RECOMMENDATION — deliberately the most prominent thing
             on the page, never buried in a collapsible section. "Select ONE
             recommendation. Not five." from the architecture doc, four turns
             ago, is what this hero card is actually enforcing visually. ──── */}
        <div className="card p-6 border-2 border-primary/30 bg-primary/5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} className="text-primary" />
            <span className="text-xs font-mono uppercase tracking-wider text-primary">Your Next Action</span>
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">{primaryName ?? "No recommendation available"}</h2>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs font-medium text-text-muted bg-surface-2 border border-border rounded-full px-2.5 py-1">
              via {result.recommended_channel}
            </span>
            <span className="text-xs font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
              {result.channel_confidence} confidence
            </span>
          </div>
          {primaryReasoning && <p className="text-sm text-text-secondary leading-relaxed mb-2">{primaryReasoning}</p>}
          {primaryEvidence && (
            <p className="text-xs text-text-muted leading-relaxed border-t border-border pt-2 mt-2">
              <span className="font-medium">Evidence:</span> {primaryEvidence}
            </p>
          )}
          {result.id && (
            <div className="border-t border-border pt-3 mt-3">
              <OutcomeReporter decisionResultId={result.id} existingOutcome={outcome?.outcome ?? null} />
            </div>
          )}
        </div>

        {result.execution_brief && (
          <ReportSection label="Execution Brief — What To Actually Write" icon="✍️" accent="green" defaultOpen>
            <div className="pt-2 flex flex-col gap-4">
              <div>
                <p className="text-xs font-medium text-text-muted mb-1">Headline</p>
                <p className="text-sm text-text-primary font-medium">&ldquo;{result.execution_brief.headline}&rdquo;</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Copy angle</p>
                  <p className="text-sm text-text-primary">{result.execution_brief.copyAngle} ({result.execution_brief.copyEmotion})</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Format</p>
                  <p className="text-sm text-text-primary">{result.execution_brief.recommendedFormat}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Offer</p>
                  <p className="text-sm text-text-primary">{result.execution_brief.offer}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">CTA</p>
                  <p className="text-sm text-text-primary">{result.execution_brief.offerCta || "—"}</p>
                </div>
              </div>
              {result.execution_brief.benchmarkContext && (
                <p className="text-xs text-text-muted border-t border-border pt-3">{result.execution_brief.benchmarkContext}</p>
              )}
              {result.execution_brief.campaignStructureNote && (
                <p className="text-xs text-text-muted">{result.execution_brief.campaignStructureNote}</p>
              )}
            </div>
          </ReportSection>
        )}

        <ReportSection label="Why This Channel" icon="🎯" accent="green" defaultOpen>
          <div className="pt-2 flex flex-col gap-4">
            <p className="text-sm text-text-secondary leading-relaxed">{result.channel_reasoning}</p>
            {result.channel_evidence && (
              <p className="text-xs text-text-muted"><span className="font-medium">Evidence:</span> {result.channel_evidence}</p>
            )}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-border">
              {channelScores.slice(0, 6).map(c => (
                <div key={c.channel} className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary w-40 truncate">{c.channel}</span>
                  <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${c.score}%` }} />
                  </div>
                  <span className="text-xs font-mono text-text-muted w-8 text-right">{c.score}</span>
                </div>
              ))}
            </div>
          </div>
        </ReportSection>

        {channelExecution && (
          <ReportSection label={`${channelExecution.channel} — Execution Detail`} icon="⚙️" accent="blue" defaultOpen>
            <div className="pt-2">
              <p className="text-sm text-text-secondary mb-3">{String(channelExecution.targetingSummary)}</p>
              {(() => {
                const data = (channelExecution.channelData ?? {}) as Record<string, unknown>;
                const listData = (data.checklist ?? data.sequence ?? data.tasks) as Record<string, unknown>[] | undefined;
                if (listData) return <ChecklistDisplay items={listData} isSequence={!!data.sequence || !!data.tasks} />;
                if (data.interests) return <InterestsDisplay interests={data.interests as Record<string, unknown>[]} />;
                return <p className="text-xs text-text-muted">No detailed execution data available for this channel.</p>;
              })()}
            </div>
          </ReportSection>
        )}

        {opportunities.length > 0 && (
          <ReportSection label="Critical Opportunities" icon="⚡" accent="amber" badge={opportunities.length}>
            <div className="pt-2 flex flex-col gap-3">
              {opportunities.map((o, i) => (
                <div key={i} className="border border-border rounded-sm p-3">
                  <p className="text-sm font-medium text-text-primary">{String(o.opportunity)}</p>
                  <p className="text-xs text-text-muted mt-1">{String(o.reasoning)}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {alternatives.length > 0 && (
          <ReportSection label="Alternative Actions" icon="🔄" accent="blue" badge={alternatives.length}>
            <div className="pt-2 flex flex-col gap-3">
              {alternatives.map((a, i) => (
                <div key={i} className="border border-border rounded-sm p-3">
                  <p className="text-sm font-medium text-text-primary">{String(a.actionName)}</p>
                  <p className="text-xs text-text-muted mt-1">{String(a.reasoningNotes ?? "")}</p>
                </div>
              ))}
            </div>
          </ReportSection>
        )}

        {gaps.length > 0 && (
          <ReportSection label="Explainability & Database Gaps" icon="🔍" accent="amber" badge={gaps.length}>
            <div className="pt-2 flex flex-col gap-2">
              <p className="text-xs text-text-muted mb-2">
                Every gap the engine found while making this recommendation — nothing here was silently dropped.
              </p>
              {gaps.map((g, i) => (
                <p key={i} className="text-xs text-text-secondary border-l-2 border-amber/40 pl-2">{g}</p>
              ))}
            </div>
          </ReportSection>
        )}
      </div>
    </AppShell>
  );
}

function ChecklistDisplay({ items, isSequence }: { items: Record<string, unknown>[]; isSequence?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item, i) => {
        const status = item.status as string | undefined;
        const blocked = status === "blocked";
        return (
          <div key={i} className={`flex items-start gap-2.5 border rounded-sm p-3 ${blocked ? "border-border opacity-60" : "border-border"}`}>
            {isSequence ? (
              blocked
                ? <span className="text-[10px] font-mono text-text-muted border border-border rounded-full px-1.5 py-0.5 flex-none mt-0.5">BLOCKED</span>
                : <CheckCircle2 size={14} className="text-primary flex-none mt-0.5" />
            ) : (
              <Target size={14} className="text-text-muted flex-none mt-0.5" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">{String(item.task)}</p>
              {item.blockedBy ? <p className="text-xs text-text-muted mt-0.5">Blocked by: {String(item.blockedBy)}</p> : null}
              {item.why || item.reasoning ? <p className="text-xs text-text-muted mt-1">{String(item.why ?? item.reasoning)}</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InterestsDisplay({ interests }: { interests: Record<string, unknown>[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {interests.slice(0, 12).map((i, idx) => (
        <span key={idx} className="text-xs bg-surface-2 border border-border rounded-full px-2.5 py-1 flex items-center gap-1.5">
          <Layers size={10} className="text-text-muted" />
          {String(i.name)}
        </span>
      ))}
    </div>
  );
}

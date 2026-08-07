"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sparkles, Plug, Archive, ListChecks } from "lucide-react";

interface SidebarRecommendation {
  title: string;
  evidence: Record<string, unknown>;
  campaignId: string | null;
}

interface SidebarConnectorStatus {
  key: string;
  displayName: string;
  connected: boolean;
  available: boolean;
}

interface ConsultantResponse {
  executiveAnswer: string;
  dataSource: string;
  evidence: Array<{ metric: string; value: string }>;
  reasoning: string;
  marketingExpertise: string | null;
  recommendations: Array<{ action: string; expectedBenefit: string; confidence: string; evidence: string; source: string }>;
  limitations: string[];
  routedTo: string;
}

/**
 * The real, production sidebar — now shown on every page via AppShell,
 * not just Mission Control. Fetches its own real data (today's
 * recommendation, connector status) client-side from
 * /api/v1/sidebar-context, since AppShell doesn't have per-page access
 * to server-fetched data the way the dashboard page's own layout did —
 * this keeps every page's own data-fetching untouched rather than
 * threading new required props through the entire app.
 *
 * Chat responses now render the FULL real structure returned by the
 * Consultant Brain — evidence, reasoning, a real recommendations list
 * with confidence badges, and limitations — instead of collapsing
 * everything into a single flat paragraph, which was hiding structure
 * the API was already providing.
 */
export function ConsultantSidebar({ firstName }: { firstName: string }) {
  const [recommendation, setRecommendation] = useState<SidebarRecommendation | null>(null);
  const [connectors, setConnectors] = useState<SidebarConnectorStatus[]>([]);
  const [loadingContext, setLoadingContext] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/sidebar-context")
      .then((res) => res.json())
      .then((body) => {
        if (cancelled) return;
        setRecommendation(body.recommendation ?? null);
        setConnectors(body.connectors ?? []);
      })
      .catch(() => { /* real read failure - sidebar just shows its honest empty states below */ })
      .finally(() => { if (!cancelled) setLoadingContext(false); });
    return () => { cancelled = true; };
  }, []);

  const [question, setQuestion] = useState("");
  const [chatResponse, setChatResponse] = useState<ConsultantResponse | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || asking) return;
    setAsking(true);
    setChatResponse(null);
    setChatError(null);
    try {
      const res = await fetch("/api/v1/consultant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setChatError(body.error ?? "Something went wrong.");
      } else {
        setChatResponse(body as ConsultantResponse);
      }
    } catch {
      setChatError("Something went wrong asking the consultant.");
    } finally {
      setAsking(false);
      setQuestion("");
    }
  }

  return (
    <aside className="w-full lg:w-72 flex-none flex flex-col gap-4">
      <div className="card p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={13} className="text-primary" />
          <p className="text-xs font-semibold text-text-primary">AI Consultant</p>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-text-muted">Beta</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">Good morning, {firstName}. I&apos;ve reviewed your marketing account.</p>

        {!loadingContext && (recommendation ? (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 mb-3">
            <p className="text-[9px] font-mono uppercase tracking-wide text-primary mb-1">Today&apos;s focus</p>
            <p className="text-xs text-text-primary mb-1.5">{recommendation.title}</p>
            {Object.keys(recommendation.evidence ?? {}).length > 0 && (
              <p className="text-[10px] text-text-muted font-mono mb-1.5">
                {Object.entries(recommendation.evidence).filter(([k]) => k !== "campaign_name").slice(0, 2).map(([k, v]) => `${k.replace(/_/g, " ")}: ${typeof v === "number" ? v.toFixed(2) : v}`).join(" · ")}
              </p>
            )}
            {recommendation.campaignId && (
              <Link href={`/campaigns/${recommendation.campaignId}?askAbout=${encodeURIComponent(recommendation.title)}#analyst`}
                className="text-xs font-semibold text-primary hover:underline">
                Review →
              </Link>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted mb-3">No critical issues detected today.</p>
        ))}

        <form onSubmit={handleAsk} className="flex gap-1.5">
          <input
            type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask me anything…"
            className="flex-1 text-xs bg-surface border border-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-primary/50"
          />
          <button type="submit" disabled={asking} className="text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-2.5 hover:bg-primary-dim transition-colors disabled:opacity-50">{asking ? "…" : "Ask"}</button>
        </form>
        {chatError && <p className="text-[11px] text-destructive mt-2 leading-relaxed">{chatError}</p>}

        {chatResponse && (
          <div className="mt-3 flex flex-col gap-2.5 border-t border-border pt-3">
            <p className="text-[11px] text-text-primary leading-relaxed font-medium">{chatResponse.executiveAnswer}</p>

            {chatResponse.evidence?.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wide mb-1">Evidence — from your account</p>
                <div className="flex flex-col gap-0.5">
                  {chatResponse.evidence.map((e, i) => <p key={i} className="text-[10px] text-text-secondary font-mono">• {e.metric}: {e.value}</p>)}
                </div>
              </div>
            )}

            {chatResponse.reasoning && (
              <p className="text-[11px] text-text-secondary leading-relaxed">{chatResponse.reasoning}</p>
            )}

            {chatResponse.marketingExpertise && (
              <div className="rounded-md bg-surface-1 border border-border px-2 py-1.5">
                <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wide mb-0.5">General guidance — not from your data</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">{chatResponse.marketingExpertise}</p>
              </div>
            )}

            {chatResponse.recommendations?.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wide mb-1 flex items-center gap-1"><ListChecks size={10} />Recommendations</p>
                <div className="flex flex-col gap-1.5">
                  {chatResponse.recommendations.map((r, i) => (
                    <div key={i} className="rounded-md bg-surface-1 border border-border p-2">
                      <div className="flex items-center gap-1 flex-wrap mb-0.5">
                        <p className="text-[11px] font-medium text-text-primary">{r.action}</p>
                        <span className="text-[8px] font-mono uppercase px-1 py-0.5 rounded-full bg-surface-2 border border-border text-text-muted">{r.confidence}</span>
                        <span className={`text-[8px] font-mono uppercase px-1 py-0.5 rounded-full border ${r.source === "business_intelligence" ? "bg-primary/10 text-primary border-primary/20" : "bg-surface-2 text-text-muted border-border"}`}>
                          {r.source === "business_intelligence" ? "your data" : "general"}
                        </span>
                      </div>
                      <p className="text-[10px] text-text-secondary">{r.expectedBenefit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chatResponse.limitations?.length > 0 && (
              <div>
                <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wide mb-1">What this can&apos;t tell you</p>
                <div className="flex flex-col gap-0.5">
                  {chatResponse.limitations.map((l, i) => <p key={i} className="text-[10px] text-text-muted">• {l}</p>)}
                </div>
              </div>
            )}

            <p className="text-[9px] text-text-muted">via {chatResponse.routedTo}</p>
          </div>
        )}
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold text-text-primary mb-2.5">Quick Actions</p>
        <div className="flex flex-col gap-1.5">
          <Link href="/research/new" className="text-xs text-text-secondary hover:text-text-primary transition-colors">New Campaign</Link>
          <Link href="/campaigns" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Analyze Campaign</Link>
          <Link href="/reports" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Create Report</Link>
          <Link href="/analysis/new" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Find Interests</Link>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Plug size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-primary">Connected Platforms</p>
        </div>
        <div className="flex flex-col gap-1.5">
          {connectors.map((c) => (
            <div key={c.key} className="flex items-center justify-between">
              <p className="text-xs text-text-secondary">{c.displayName}</p>
              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full ${c.connected ? "bg-primary/10 text-primary" : "bg-surface-2 text-text-muted"}`}>
                {c.connected ? "Connected" : c.available ? "Not connected" : "Coming soon"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/analysis/new" className="card p-4 block hover:border-border-strong transition-colors">
        <div className="flex items-center gap-1.5 mb-1">
          <Archive size={12} className="text-text-muted" />
          <p className="text-xs font-semibold text-text-primary">Meta Ads Interest Finder</p>
        </div>
        <p className="text-[11px] text-text-muted mb-2">Discover high-performing interests.</p>
        <p className="text-xs font-semibold text-primary">Find Interests →</p>
      </Link>
    </aside>
  );
}

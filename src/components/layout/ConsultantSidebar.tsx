"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Plug, Archive } from "lucide-react";

export interface SidebarRecommendation {
  title: string;
  evidence: Record<string, unknown>;
  campaignId: string | null;
}

export interface SidebarConnectorStatus {
  key: string;
  displayName: string;
  connected: boolean;
  available: boolean; // whether this connector exists at all yet, vs. genuinely "coming soon"
}

/**
 * The real, production sidebar — not a mockup. Every section either
 * uses real existing data or says honestly that it doesn't have any
 * yet. Deliberately does NOT duplicate the Campaign Analyst — this
 * chat input is account-wide in scope, which is a genuinely different,
 * unbuilt capability (no account-wide context builder exists), so it
 * responds honestly rather than faking an answer it can't actually
 * ground in anything.
 */
export function ConsultantSidebar({
  firstName, recommendation, connectors,
}: {
  firstName: string;
  recommendation: SidebarRecommendation | null;
  connectors: SidebarConnectorStatus[];
}) {
  const [question, setQuestion] = useState("");
  const [chatResponse, setChatResponse] = useState<{ executiveAnswer: string; marketingExpertise: string | null; dataSource: string; routedTo: string } | null>(null);
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
        // Real Option C structure — every response now carries an
        // honest dataSource label, so the sidebar can show which kind
        // of intelligence actually produced the answer.
        setChatResponse({ executiveAnswer: body.executiveAnswer, marketingExpertise: body.marketingExpertise ?? null, dataSource: body.dataSource, routedTo: body.routedTo });
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
      {/* AI Consultant */}
      <div className="card p-4">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles size={13} className="text-primary" />
          <p className="text-xs font-semibold text-text-primary">AI Consultant</p>
          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-text-muted">Beta</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">Good morning, {firstName}. I&apos;ve reviewed your marketing account.</p>

        {recommendation ? (
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
        )}

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
          <div className="mt-2 flex flex-col gap-1.5">
            <p className="text-[11px] text-text-secondary leading-relaxed">{chatResponse.executiveAnswer}</p>
            {chatResponse.marketingExpertise && (
              <div className="rounded-md bg-surface-1 border border-border px-2 py-1.5">
                <p className="text-[9px] font-semibold text-text-muted uppercase tracking-wide mb-0.5">General guidance — not from your data</p>
                <p className="text-[11px] text-text-secondary leading-relaxed">{chatResponse.marketingExpertise}</p>
              </div>
            )}
            <p className="text-[10px] text-text-muted">via {chatResponse.routedTo}</p>
          </div>
        )}
      </div>

      {/* Quick Actions - real routes only, no placeholder buttons */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-text-primary mb-2.5">Quick Actions</p>
        <div className="flex flex-col gap-1.5">
          <Link href="/research/new" className="text-xs text-text-secondary hover:text-text-primary transition-colors">New Campaign</Link>
          <Link href="/campaigns" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Analyze Campaign</Link>
          <Link href="/reports" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Create Report</Link>
          <Link href="/analysis/new" className="text-xs text-text-secondary hover:text-text-primary transition-colors">Find Interests</Link>
        </div>
      </div>

      {/* Connected Platforms - real status, no hardcoding */}
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

      {/* Meta Ads Interest Finder - a real, first-class product, not an internal engine */}
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

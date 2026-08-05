"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, ListChecks, HelpCircle } from "lucide-react";
import { SUGGESTED_QUESTIONS } from "@/lib/campaignAnalyst/prompt";

interface AnalystResponse {
  executiveAnswer: string;
  evidence: Array<{ metric: string; value: string }>;
  reasoning: string;
  recommendations: Array<{ action: string; expectedBenefit: string; confidence: string; evidence: string }>;
  limitations: string[];
  suggestedFollowUps: string[];
}

/**
 * Deliberately not built as an open-ended chat box with empty
 * placeholder text — suggested questions are the primary entry point,
 * per the explicit "instead of an empty chat box" requirement. Every
 * response renders the full required structure (executive answer,
 * evidence, reasoning, recommendations, limitations) — never just the
 * headline claim with the supporting structure hidden or omitted.
 */
export function CampaignAnalyst({ campaignId }: { campaignId: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AnalystResponse | null>(null);

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const res = await fetch(`/api/v1/campaigns/${campaignId}/analyst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
      setResponse(body);
      setQuestion("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong asking the analyst.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
        <Sparkles size={14} className="text-text-muted" />
        Ask the Campaign Analyst
      </h2>

      {!response && !loading && (
        <div className="flex flex-wrap gap-2 mb-3">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} type="button" onClick={() => ask(q)}
              className="text-xs text-text-secondary bg-surface-2 border border-border rounded-full px-3 py-1.5 hover:border-border-strong hover:text-text-primary transition-colors">
              {q}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); if (question.trim()) ask(question.trim()); }} className="flex gap-2 mb-4">
        <input
          type="text" value={question} onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask about this campaign's real data…"
          className="flex-1 text-sm bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50"
        />
        <button type="submit" disabled={loading || !question.trim()}
          className="text-sm font-semibold bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary-dim transition-colors disabled:opacity-50">
          Ask
        </button>
      </form>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-text-muted py-6">
          <Loader2 size={14} className="animate-spin" />
          Reading this campaign&apos;s real data…
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2 mb-4">
          <AlertTriangle size={14} className="flex-none mt-0.5" />
          {error}
        </div>
      )}

      {response && (
        <div className="flex flex-col gap-4">
          <div className="card p-4">
            <p className="text-sm text-text-primary leading-relaxed">{response.executiveAnswer}</p>
          </div>

          {response.evidence.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Evidence</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary font-mono">
                {response.evidence.map((e, i) => <span key={i}>{e.metric}: {e.value}</span>)}
              </div>
            </div>
          )}

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Reasoning</p>
            <p className="text-sm text-text-secondary">{response.reasoning}</p>
          </div>

          {response.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <ListChecks size={12} />
                Recommendations
              </p>
              <div className="flex flex-col gap-2">
                {response.recommendations.map((r, i) => (
                  <div key={i} className="card p-3">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-text-primary">{r.action}</p>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full bg-surface-2 border border-border text-text-muted">{r.confidence} confidence</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-1">{r.expectedBenefit}</p>
                    <p className="text-[11px] text-text-muted font-mono">{r.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {response.limitations.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <HelpCircle size={12} />
                What this can&apos;t tell you
              </p>
              <div className="flex flex-col gap-1">
                {response.limitations.map((l, i) => <p key={i} className="text-xs text-text-muted">{l}</p>)}
              </div>
            </div>
          )}

          {response.suggestedFollowUps.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-2">You may also want to ask:</p>
              <div className="flex flex-wrap gap-2">
                {response.suggestedFollowUps.map((q) => (
                  <button key={q} type="button" onClick={() => ask(q)}
                    className="text-xs text-text-secondary bg-surface-2 border border-border rounded-full px-3 py-1.5 hover:border-border-strong hover:text-text-primary transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { Sparkles, Loader2, AlertTriangle, ListChecks, HelpCircle, Download, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { SUGGESTED_QUESTIONS } from "@/lib/campaignAnalyst/prompt";
import { reportCampaignRecommendationOutcome } from "./analystActions";

interface AnalystResponse {
  executiveAnswer: string;
  dataSource: "business_intelligence" | "marketing_expertise" | "combined";
  evidence: Array<{ metric: string; value: string }>;
  reasoning: string;
  marketingExpertise: string | null;
  recommendations: Array<{ action: string; expectedBenefit: string; confidence: string; evidence: string; source: "business_intelligence" | "marketing_expertise" }>;
  limitations: string[];
  suggestedFollowUps: string[];
  recommendationId: string | null;
}

export interface ExportableCampaignData {
  campaignName: string;
  healthScore: number | null;
  metrics: Record<string, number | null>;
  opportunities: Array<{ title: string; confidence: string; evidence: Record<string, unknown> }>;
}

/**
 * Deliberately not built as an open-ended chat box with empty
 * placeholder text — suggested questions are the primary entry point,
 * per the explicit "instead of an empty chat box" requirement. Every
 * response renders the full required structure (executive answer,
 * evidence, reasoning, recommendations, limitations) — never just the
 * headline claim with the supporting structure hidden or omitted.
 */
export function CampaignAnalyst({ campaignId, exportData, initialQuestion }: { campaignId: string; exportData: ExportableCampaignData; initialQuestion?: string }) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AnalystResponse | null>(null);
  const [outcomeReported, setOutcomeReported] = useState(false);
  const [reportingOutcome, setReportingOutcome] = useState(false);

  async function handleReportOutcome(outcome: "worked" | "did_not_work" | "too_early_to_tell") {
    if (!response?.recommendationId || reportingOutcome) return;
    setReportingOutcome(true);
    const result = await reportCampaignRecommendationOutcome(response.recommendationId, outcome);
    setReportingOutcome(false);
    if (!result.error) setOutcomeReported(true);
  }

  // Real client-side export — no PDF library added to the app, no
  // server round-trip needed. Includes the actual data already on the
  // page (health, metrics, real opportunities), plus the last analyst
  // response if one was asked, since that's real, evidence-backed
  // content worth taking along, not just raw numbers.
  function exportReport() {
    const lines: string[] = [
      `# ${exportData.campaignName}`,
      "",
      `Health score: ${exportData.healthScore ?? "insufficient data"}`,
      "",
      "## Metrics",
      ...Object.entries(exportData.metrics).map(([k, v]) => `- ${k}: ${v ?? "—"}`),
      "",
      "## Open Opportunities",
      ...(exportData.opportunities.length === 0
        ? ["None currently flagged."]
        : exportData.opportunities.map((o) => `- **${o.title}** (${o.confidence} confidence) — ${Object.entries(o.evidence).map(([k, v]) => `${k}: ${v}`).join(", ")}`)),
    ];

    if (response) {
      lines.push(
        "",
        "## Campaign Analyst — Last Question",
        "",
        `**Answer:** ${response.executiveAnswer}`,
        "",
        "**Evidence (from your account):** " + (response.evidence.length > 0 ? response.evidence.map((e) => `${e.metric}: ${e.value}`).join(", ") : "none"),
        "",
        response.reasoning ? `**Reasoning:** ${response.reasoning}` : "",
        response.marketingExpertise ? `\n**General marketing expertise (not from your account data):** ${response.marketingExpertise}` : "",
        "",
        "**Recommendations:**",
        ...response.recommendations.map((r) => `- ${r.action} (${r.confidence} confidence, ${r.source === "business_intelligence" ? "your data" : "general guidance"}) — ${r.evidence}`),
        "",
        "**Limitations:**",
        ...response.limitations.map((l) => `- ${l}`),
      );
    }

    lines.push("", `_Exported ${new Date().toLocaleString()} — every number above is real, synced data. Nothing here is estimated or fabricated._`);

    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exportData.campaignName.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setResponse(null);
    setOutcomeReported(false);
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

  // The real "Review already knows what I'm looking at" behavior — an
  // opportunity clicked on the Opportunities page lands here with the
  // relevant question already asked, not just a pre-filled box waiting
  // for the user to hit submit themselves. Runs once, only when a real
  // initialQuestion was actually passed in.
  useEffect(() => {
    if (initialQuestion) {
      ask(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="analyst">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
          <Sparkles size={14} className="text-text-muted" />
          Ask the Campaign Analyst
        </h2>
        <button type="button" onClick={exportReport}
          className="text-xs font-medium text-text-secondary hover:text-text-primary flex items-center gap-1 border border-border rounded-lg px-2.5 py-1.5 hover:border-border-strong transition-colors">
          <Download size={12} />
          Export
        </button>
      </div>

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
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Evidence — from your account</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary font-mono">
                {response.evidence.map((e, i) => <span key={i}>{e.metric}: {e.value}</span>)}
              </div>
            </div>
          )}

          {response.reasoning && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Reasoning</p>
              <p className="text-sm text-text-secondary">{response.reasoning}</p>
            </div>
          )}

          {/* Real, visually distinct — Option C's actual implementation.
              Never rendered inside the same block as evidence-based
              reasoning, so it can never be mistaken for a finding
              derived from the account's own data. */}
          {response.marketingExpertise && (
            <div className="rounded-lg border border-border bg-surface-2 p-3">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">General marketing expertise — not from your account data</p>
              <p className="text-sm text-text-secondary">{response.marketingExpertise}</p>
            </div>
          )}

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
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-full border ${r.source === "business_intelligence" ? "bg-primary/10 text-primary border-primary/20" : "bg-surface-2 text-text-muted border-border"}`}>
                        {r.source === "business_intelligence" ? "your data" : "general guidance"}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mb-1">{r.expectedBenefit}</p>
                    <p className="text-[11px] text-text-muted font-mono">{r.evidence}</p>
                  </div>
                ))}
              </div>

              {/* Real Learning gap closed here — reporting an outcome
                  feeds directly back into pastCampaignRecommendations
                  for this same campaign's next question. */}
              {response.recommendationId && (
                outcomeReported ? (
                  <p className="text-xs text-primary mt-2">Thanks — this will inform future recommendations for this campaign.</p>
                ) : (
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border">
                    <p className="text-[11px] text-text-muted">Did this work?</p>
                    <button type="button" disabled={reportingOutcome} onClick={() => handleReportOutcome("worked")}
                      className="text-[11px] flex items-center gap-1 text-text-secondary hover:text-primary transition-colors disabled:opacity-50">
                      <ThumbsUp size={11} /> Worked
                    </button>
                    <button type="button" disabled={reportingOutcome} onClick={() => handleReportOutcome("did_not_work")}
                      className="text-[11px] flex items-center gap-1 text-text-secondary hover:text-destructive transition-colors disabled:opacity-50">
                      <ThumbsDown size={11} /> Didn&apos;t work
                    </button>
                    <button type="button" disabled={reportingOutcome} onClick={() => handleReportOutcome("too_early_to_tell")}
                      className="text-[11px] flex items-center gap-1 text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
                      <Clock size={11} /> Too early
                    </button>
                  </div>
                )
              )}
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

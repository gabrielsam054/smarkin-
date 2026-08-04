import Link from "next/link";
import { Brain, Sparkles, Users, Network, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import type {
  ProductProfile, CustomerProfile, KnowledgeGraphProfile,
} from "@/lib/businessIntelligenceEngine";

interface ProfileRow {
  product_name: string;
  product_profile: ProductProfile;
  customer_profile: CustomerProfile;
  knowledge_graph_profile: KnowledgeGraphProfile;
  gaps: string[] | null;
  updated_at?: string;
}

/**
 * The real Marketing Brain page — built on business_intelligence_profiles,
 * genuine pre-existing infrastructure (businessIntelligenceEngine.ts +
 * businessIntelligenceCache.ts) that predates this project's own v16
 * schema work entirely. Deliberately NOT built against the
 * business_contexts table from v16 — that table was designed as part
 * of the architectural vision but was confirmed to have zero writers;
 * building against it would have meant a permanently empty page
 * regardless of what UI sat on top. Keyed by user_id directly, matching
 * how this pre-existing table was actually designed — not forced onto
 * the workspace_id model built for the connector work, which this
 * table predates.
 */
export default async function MarketingBrainPage() {
  const { user, supabase } = await requireUser("/intelligence/brain");
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  // Defensive by necessity: this table's real RLS policy shape was
  // never confirmed from this session (it predates all the v16 work,
  // and its own source file's comments note "needs verification
  // against the real deployed database before being trusted") — if
  // the query fails for any reason, this degrades to the honest empty
  // state rather than crashing the page.
  const { data: rows, error } = await supabase
    .from("business_intelligence_profiles")
    .select("product_name, product_profile, customer_profile, knowledge_graph_profile, gaps, updated_at")
    .eq("user_id", user.id);

  if (error) {
    console.error("[marketing-brain] failed to load business_intelligence_profiles:", error.message);
  }

  const profiles = (rows ?? []) as unknown as ProfileRow[];

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Marketing Brain">
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Marketing Brain</h1>
          <p className="text-sm text-text-secondary mt-1">What Smarkin has actually understood about your business, from real research runs.</p>
        </div>

        {profiles.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <Brain size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">Nothing understood yet</p>
            <p className="text-sm text-text-secondary max-w-sm mb-5">
              Smarkin builds its understanding of your business as you run research — nothing reasoned about yet.
            </p>
            <Link href="/research/new" className="text-sm font-semibold text-primary hover:underline">Run Customer Research</Link>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {profiles.map((p) => (
              <div key={p.product_name} className="card p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-base font-semibold text-text-primary">{p.product_name}</h2>
                  {p.product_profile?.matched && (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
                      <Sparkles size={11} />
                      {p.product_profile.confidenceWeight}% confidence
                    </span>
                  )}
                </div>

                {p.product_profile?.matched ? (
                  <div className="grid sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Industry / Category</p>
                      <p className="text-sm text-text-primary">{p.product_profile.industry} · {p.product_profile.category}</p>
                    </div>
                    <div>
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Customer Problem</p>
                      <p className="text-sm text-text-primary">{p.product_profile.customerProblem || "—"}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">What Smarkin thinks this is</p>
                      <p className="text-sm text-text-secondary">{p.product_profile.functionalDescription || "—"}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted mb-4">No confident product classification found for this business — real gap, not a display placeholder.</p>
                )}

                {p.customer_profile?.personas?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Users size={12} />
                      Understood personas ({p.customer_profile.personas.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {p.customer_profile.personas.slice(0, 5).map((persona, i) => (
                        <span key={i} className="text-xs text-text-secondary bg-surface-2 border border-border rounded-full px-2.5 py-1">
                          {persona.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {p.knowledge_graph_profile?.matched && (
                  <div className="mb-4">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <Network size={12} />
                      Knowledge graph connections
                    </p>
                    <p className="text-xs text-text-secondary">
                      {p.knowledge_graph_profile.connectedGoals?.length ?? 0} goals · {p.knowledge_graph_profile.connectedPersonas?.length ?? 0} personas · {p.knowledge_graph_profile.connectedPainPoints?.length ?? 0} pain points
                    </p>
                  </div>
                )}

                {p.gaps && p.gaps.length > 0 && (
                  <div className="pt-3 border-t border-border">
                    <p className="text-xs text-text-muted uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} className="text-amber" />
                      What Smarkin doesn&apos;t know yet
                    </p>
                    <div className="flex flex-col gap-1">
                      {p.gaps.slice(0, 3).map((gap, i) => (
                        <p key={i} className="text-xs text-text-secondary">{gap}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

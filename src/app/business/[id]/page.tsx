import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { ConfidenceBadge } from "@/components/shared/ConfidenceBadge";
import { GapList } from "@/components/shared/GapBadge";
import { Tooltip } from "@/components/shared/Tooltip";
import {
  ProductProfile, CustomerProfile, KnowledgeGraphProfile,
} from "@/lib/businessIntelligenceEngine";

interface BusinessDetailRow {
  id: string;
  product_name: string;
  product_profile: ProductProfile;
  customer_profile: CustomerProfile;
  knowledge_graph_profile: KnowledgeGraphProfile;
  gaps: string[];
  computed_at: string;
}

// Truncates for the compact card layout — Tooltip reveals the full string
// on hover, its first real use anywhere in the app.
function TruncatedField({ label, text }: { label: string; text: string }) {
  const isLong = text.length > 90;
  const display = isLong ? `${text.slice(0, 90)}...` : text;
  return (
    <div>
      <p className="text-xs text-text-muted uppercase tracking-wide mb-1">{label}</p>
      {isLong ? (
        <Tooltip content={text}>
          <p className="text-sm text-text-secondary">{display}</p>
        </Tooltip>
      ) : (
        <p className="text-sm text-text-secondary">{text || "—"}</p>
      )}
    </div>
  );
}

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("business_intelligence_profiles")
    .select("id, product_name, product_profile, customer_profile, knowledge_graph_profile, gaps, computed_at")
    .eq("id", id).eq("user_id", user.id).single();
  if (!row) notFound();

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const data = row as BusinessDetailRow;
  const { product_profile: pp, customer_profile: cp, knowledge_graph_profile: kg, gaps } = data;

  return (
    <AppShell
      firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Business"
      headerLeft={<Link href="/business" className="text-text-muted hover:text-text-primary transition-colors"><ArrowLeft size={18} /></Link>}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 flex flex-col gap-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-mono uppercase tracking-wider text-text-muted">Business Intelligence</p>
            <h1 className="text-xl font-bold text-text-primary">{data.product_name}</h1>
          </div>
          <ConfidenceBadge score={pp.confidenceWeight} />
        </div>

        <div className="card p-5 flex flex-col gap-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Product Understanding</p>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div><span className="text-text-muted">Industry</span><p className="text-text-secondary mt-0.5">{pp.industry || "—"}</p></div>
            <div><span className="text-text-muted">Category</span><p className="text-text-secondary mt-0.5">{pp.category || "—"}</p></div>
          </div>
          <TruncatedField label="What it does" text={pp.functionalDescription} />
          <TruncatedField label="Customer problem it solves" text={pp.customerProblem} />
          <TruncatedField label="Customer goals" text={pp.customerGoals} />
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Customer Snapshot</p>
          {cp.personas.length > 0 ? (
            <div className="flex flex-col gap-2">
              {cp.personas.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm border-b border-border py-2 last:border-0">
                  <span className="text-text-primary">{p.name}</span>
                  <span className="text-xs text-text-muted">{p.goal}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">No personas found via tag-overlap for this product.</p>
          )}
          <Link href="/research/new" className="text-xs font-medium text-primary hover:underline">
            Run full Customer Research for deeper personas →
          </Link>
        </div>

        <div className="card p-5 flex flex-col gap-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Knowledge Graph Connections</p>
          {kg.matched ? (
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-text-muted mb-1">Goals</p>
                {kg.connectedGoals.map((g, i) => <p key={i} className="text-text-secondary">{g}</p>)}
              </div>
              <div>
                <p className="text-text-muted mb-1">Personas</p>
                {kg.connectedPersonas.map((p, i) => <p key={i} className="text-text-secondary">{p}</p>)}
              </div>
              <div>
                <p className="text-text-muted mb-1">Pain Points</p>
                {kg.connectedPainPoints.map((pt, i) => <p key={i} className="text-text-secondary">{pt}</p>)}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted">No verified Knowledge Graph connections for this product.</p>
          )}
        </div>

        <GapList gaps={gaps} />
      </div>
    </AppShell>
  );
}

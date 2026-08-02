import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Plus, Zap, Target, ArrowRight, Clock, AlertCircle } from "lucide-react";
import { createCampaign } from "./actions";

export const metadata = { title: "Campaign Workspace — Smarkin AI" };

const STATUS_COLORS: Record<string, string> = {
  draft:     "bg-surface-2 text-text-muted border-border",
  active:    "bg-primary/10 text-primary border-primary/25",
  paused:    "bg-amber/10 text-amber border-amber/25",
  completed: "bg-secondary/10 text-secondary border-secondary/25",
  archived:  "bg-surface-3 text-text-muted border-border",
};

async function CreateCampaignButton() {
  async function create(formData: FormData) {
    "use server";
    const name = (formData.get("name") as string)?.trim() || "New Campaign";
    const result = await createCampaign(name);
    if (result.id) redirect(`/workspace/${result.id}`);
    // If error, fall through — page will show DB setup notice
  }
  return (
    <form action={create} className="flex gap-2">
      <input
        name="name"
        placeholder="e.g. Summer Fashion Sale"
        className="flex-1 bg-surface border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        required
      />
      <button type="submit"
        className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold text-sm px-5 py-2.5 rounded-lg shadow-green-btn hover:bg-primary-dim transition-colors flex-none">
        <Plus size={14} /> Create
      </button>
    </form>
  );
}

export default async function WorkspacePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Try to load campaigns — will fail if table doesn't exist yet
  const { data: campaigns, error: tableError } = await supabase
    .from("campaigns")
    .select("id, name, emoji, status, industry, product, overall_health, last_active_tab, updated_at, campaign_goal")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const tableNotFound = tableError?.message?.includes("does not exist") ||
                        tableError?.code === "42P01" ||
                        tableError?.message?.includes("relation");

  const formatDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return `${diff}d ago`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-surface/80 backdrop-blur px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary tracking-tight">Campaign Workspace</h1>
            <p className="text-sm text-text-muted mt-0.5">Plan your campaign before you spend a dollar</p>
          </div>
          <div className="w-full max-w-md">
            <CreateCampaignButton />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* DB setup notice */}
        {tableNotFound && (
          <div className="flex items-start gap-4 bg-amber/8 border border-amber/25 rounded-xl p-5 mb-8">
            <AlertCircle size={18} className="text-amber flex-none mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">One-time database setup required</p>
              <p className="text-sm text-text-secondary mb-3">
                The Campaign Workspace needs its database tables created. Run this SQL in your Supabase SQL Editor:
              </p>
              <div className="bg-background rounded-lg px-4 py-3 border border-border font-mono text-[11px] text-text-secondary mb-3">
                Go to: Supabase → SQL Editor → paste contents of{" "}
                <span className="text-primary">supabase/migrations/011_campaign_workspace.sql</span>
                {" "}→ Run
              </div>
              <p className="text-xs text-text-muted">This only needs to be done once. After running, refresh this page.</p>
            </div>
          </div>
        )}

        {!tableNotFound && campaigns && campaigns.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-text-muted">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {campaigns.map((c) => (
                <Link key={c.id} href={`/workspace/${c.id}`}
                  className="card p-5 hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 group block">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-xl flex-none">
                        {c.emoji}
                      </div>
                      <div>
                        <h3 className="font-semibold text-text-primary text-[14px] group-hover:text-primary transition-colors leading-tight">
                          {c.name}
                        </h3>
                        <p className="text-[11px] text-text-muted mt-0.5">{c.industry || "No industry set"}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${STATUS_COLORS[c.status] ?? STATUS_COLORS.draft}`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {c.product && (
                      <div className="flex items-center gap-2 text-[12px] text-text-secondary">
                        <Target size={11} className="text-text-muted flex-none" />
                        {c.product}
                      </div>
                    )}
                    {c.campaign_goal && (
                      <div className="flex items-center gap-2 text-[12px] text-text-secondary">
                        <Zap size={11} className="text-primary flex-none" />
                        {c.campaign_goal}
                      </div>
                    )}
                  </div>

                  {c.overall_health > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-text-muted">Campaign Health</span>
                        <span className={c.overall_health >= 70 ? "text-primary" : c.overall_health >= 40 ? "text-amber" : "text-destructive"}>
                          {c.overall_health}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-2 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${c.overall_health >= 70 ? "bg-primary" : c.overall_health >= 40 ? "bg-amber" : "bg-destructive"}`}
                          style={{ width: `${c.overall_health}%` }} />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                      <Clock size={10} />
                      {formatDate(c.updated_at)}
                    </div>
                    <span className="text-[11px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                      Open <ArrowRight size={10} />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : !tableNotFound ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-surface border border-border flex items-center justify-center mb-6 text-3xl">
              🎯
            </div>
            <h2 className="text-xl font-bold text-text-primary mb-2">Plan your first campaign</h2>
            <p className="text-text-muted text-sm max-w-md mb-8 leading-relaxed">
              Enter a campaign name above and click Create — or pick one of these examples to get started instantly.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8 max-w-lg">
              {["Summer Fashion Sale", "Black Friday Campaign", "Restaurant Launch", "Gym Membership", "Luxury Watches", "App Launch"].map((name) => (
                <form key={name} action={async () => {
                  "use server";
                  const result = await createCampaign(name);
                  if (result.id) redirect(`/workspace/${result.id}`);
                }}>
                  <button type="submit"
                    className="w-full text-left px-3 py-2.5 rounded-lg border border-border bg-surface hover:border-primary/30 hover:bg-surface-2 transition-all text-[12px] text-text-secondary hover:text-text-primary">
                    {name}
                  </button>
                </form>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

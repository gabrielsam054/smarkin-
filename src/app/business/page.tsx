import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Building2, ChevronRight, Sparkles } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { CommandBar } from "@/components/ai/CommandBar";
import { EmptyState } from "@/components/shared/EmptyState";

interface BusinessRow {
  id: string;
  product_name: string;
  product_profile: { industry?: string; category?: string; confidenceWeight?: number };
  gaps: string[];
  computed_at: string;
}

export default async function BusinessHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: businesses }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    supabase.from("business_intelligence_profiles")
      .select("id, product_name, product_profile, gaps, computed_at")
      .eq("user_id", user.id).order("computed_at", { ascending: false }),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const rows = (businesses ?? []) as BusinessRow[];

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Business">
      <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        <CommandBar />

        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Business Intelligence</h1>
          <p className="text-sm text-text-secondary mt-1">
            Every business you&apos;ve researched — cached once, reused by every capability that needs it.
          </p>
        </div>

        <div className="card overflow-hidden">
          {rows.length > 0 ? (
            <div className="divide-y divide-border">
              {rows.map(row => {
                const confidence = row.product_profile?.confidenceWeight;
                return (
                  <Link key={row.id} href={`/business/${row.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-surface-2/60 transition-colors group">
                    <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-none">
                      <Building2 size={16} className="text-text-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate group-hover:text-primary transition-colors">
                        {row.product_name}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">
                        {row.product_profile?.industry ?? "Industry unknown"} · {row.product_profile?.category ?? "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 flex-none">
                      {typeof confidence === "number" && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Sparkles size={11} />{confidence}
                        </span>
                      )}
                      {row.gaps.length > 0 && (
                        <span className="text-[10px] font-mono text-amber bg-amber/10 border border-amber/20 rounded-full px-2 py-0.5">
                          {row.gaps.length} gap{row.gaps.length === 1 ? "" : "s"}
                        </span>
                      )}
                      <ChevronRight size={13} className="text-text-muted group-hover:text-primary transition-colors" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={Building2}
              title="No businesses researched yet"
              description="Once you run Customer Research or ask for a marketing decision, the business you researched shows up here — reused automatically by anything else that needs it."
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

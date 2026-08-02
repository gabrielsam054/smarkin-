import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { TrendingUp, Users, Target, Brain, BarChart2, Globe } from "lucide-react";

export const metadata = { title: "Analytics — Control Center" };

export default async function Analytics() {
  await requireAdmin();
  const supabase = await createClient();

  let totalUsers = 0, campaigns = 0, analyses = 0;
  try {
    const [r1, r2, r3] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("campaigns").select("*", { count: "exact", head: true }),
      supabase.from("analysis_requests").select("*", { count: "exact", head: true }),
    ]);
    totalUsers = (r1.count ?? 0);
    campaigns  = (r2.count ?? 0);
    analyses   = (r3.count ?? 0);
  } catch { totalUsers = 0; campaigns = 0; analyses = 0; }

  let topIndustries: { industry?: string }[] = [];
  try {
    const { data } = await supabase
      .from("analysis_results")
      .select("industry")
      .not("industry", "is", null)
      .limit(100);
    topIndustries = (data ?? []) as { industry?: string }[];
  } catch { topIndustries = []; }

  const industryCounts: Record<string, number> = {};
  for (const r of topIndustries) {
    if (r.industry) industryCounts[r.industry] = (industryCounts[r.industry] || 0) + 1;
  }
  const topIndustriesSorted = Object.entries(industryCounts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const maxCount = topIndustriesSorted[0]?.[1] ?? 1;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Analytics</h1>
        <p className="text-sm text-text-muted mt-0.5">Platform performance and usage metrics</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: totalUsers ?? 0, icon: Users, color: "text-primary", bg: "bg-primary/10" },
          { label: "Campaigns", value: campaigns ?? 0, icon: Target, color: "text-secondary", bg: "bg-secondary/10" },
          { label: "AI Analyses", value: analyses ?? 0, icon: Brain, color: "text-amber", bg: "bg-amber/10" },
          { label: "Conversion Rate", value: "0%", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
              <Icon size={15} className={color} />
            </div>
            <p className="text-2xl font-black text-text-primary">{value}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Top Industries */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={15} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Top Industries Analyzed</h3>
        </div>
        {topIndustriesSorted.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-8">No analysis data yet</p>
        ) : (
          <div className="space-y-3">
            {topIndustriesSorted.map(([industry, count]) => (
              <div key={industry} className="flex items-center gap-3">
                <span className="text-[12px] text-text-secondary w-36 flex-none truncate">{industry}</span>
                <div className="flex-1 h-2 bg-surface-2 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
                <span className="text-[11px] text-text-muted w-6 text-right flex-none">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Placeholder charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {["User Growth", "Campaign Volume"].map(title => (
          <div key={title} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
            </div>
            <div className="h-32 flex items-end gap-2">
              {[20, 45, 30, 65, 55, 80, 70, 90, 75, 95, 85, 100].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-sm bg-primary/20 hover:bg-primary/40 transition-colors"
                  style={{ height: `${h}%` }} />
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-2">
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map(m => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

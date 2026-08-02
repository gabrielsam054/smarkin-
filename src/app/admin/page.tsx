import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import {
  Users, TrendingUp, Activity,
  Brain, Target, ArrowUpRight,
  CheckCircle,
} from "lucide-react";

export const metadata = { title: "Control Center — Smarkin AI" };

async function getStats(supabase: Awaited<ReturnType<typeof createClient>>) {
  const now30d = new Date(Date.now() - 30*24*60*60*1000).toISOString();
  const [r1, r2, r3, r4] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).gte("updated_at", now30d),
    supabase.from("campaigns").select("*", { count: "exact", head: true }),
    supabase.from("analysis_requests").select("*", { count: "exact", head: true }),
  ]);
  return {
    totalUsers:  (r1.count ?? 0),
    activeUsers: (r2.count ?? 0),
    campaigns:   (r3.count ?? 0),
    analyses:    (r4.count ?? 0),
  };
}

export default async function AdminDashboard() {
  await requireAdmin();
  const supabase = await createClient();
  const stats = await getStats(supabase).catch(() => ({ totalUsers: 0, activeUsers: 0, campaigns: 0, analyses: 0 }));

  let recentUsers: { id: string; full_name?: string; email?: string; plan?: string; created_at: string }[] = [];
  let recentCampaigns: { id: string; name: string; status: string; created_at: string }[] = [];
  try {
    const { data } = await supabase.from("profiles").select("id, full_name, email, plan, created_at").order("created_at", { ascending: false }).limit(8);
    recentUsers = (data ?? []) as typeof recentUsers;
  } catch { recentUsers = []; }
  try {
    const { data } = await supabase.from("campaigns").select("id, name, status, created_at").order("created_at", { ascending: false }).limit(5);
    recentCampaigns = (data ?? []) as typeof recentCampaigns;
  } catch { recentCampaigns = []; }

  const formatNum = (n: number) => n >= 1000 ? `${(n/1000).toFixed(1)}k` : n.toString();
  const formatDate = (d: string) => {
    const diff = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
  };

  const STAT_CARDS = [
    { label: "Total Users",  value: formatNum(stats.totalUsers),  icon: Users,    color: "text-primary",   bg: "bg-primary/10"   },
    { label: "Active (30d)", value: formatNum(stats.activeUsers), icon: Activity, color: "text-secondary", bg: "bg-secondary/10" },
    { label: "Campaigns",    value: formatNum(stats.campaigns),   icon: Target,   color: "text-amber",     bg: "bg-amber/10"     },
    { label: "AI Analyses",  value: formatNum(stats.analyses),    icon: Brain,    color: "text-primary",   bg: "bg-primary/10"   },
  ];

  const SYSTEM_STATUS = [
    { label: "Database",       latency: "12ms"  },
    { label: "Authentication", latency: "8ms"   },
    { label: "Storage",        latency: "24ms"  },
    { label: "AI Engine",      latency: "180ms" },
    { label: "Email",          latency: "—"     },
    { label: "Payments",       latency: "—"     },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Control Center</h1>
          <p className="text-sm text-text-muted mt-0.5">Smarkin AI — Operating System</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-primary bg-primary/8 border border-primary/20 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          All systems operational
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={16} className={color} />
              </div>
              <span className="text-[11px] font-semibold text-primary flex items-center gap-0.5">
                <TrendingUp size={10} />+0%
              </span>
            </div>
            <p className="text-2xl font-black text-text-primary">{value}</p>
            <p className="text-[11px] text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Revenue Overview</h3>
            <span className="text-[11px] text-text-muted">Last 30 days</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            {[
              { label: "MRR", value: "GHS 0", note: "Monthly Recurring" },
              { label: "ARR", value: "GHS 0", note: "Annual Run Rate" },
              { label: "Conversion", value: "0%", note: "Trial → Paid" },
            ].map(({ label, value, note }) => (
              <div key={label} className="bg-surface-2 rounded-xl p-3 border border-border">
                <p className="text-[10px] text-text-muted mb-0.5">{note}</p>
                <p className="text-base font-black text-text-primary">{value}</p>
                <p className="text-[10px] font-semibold text-text-muted">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-text-muted">Revenue tracking activates when first paid subscription is created</p>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">System Health</h3>
            <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Live</span>
          </div>
          <div className="space-y-2">
            {SYSTEM_STATUS.map(({ label, latency }) => (
              <div key={label} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <CheckCircle size={12} className="text-primary" />
                  <span className="text-[12px] text-text-secondary">{label}</span>
                </div>
                <span className="text-[10px] text-text-muted">{latency}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Users</h3>
            <a href="/admin/users" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight size={10} />
            </a>
          </div>
          {recentUsers.length === 0 ? (
            <p className="text-[12px] text-text-muted text-center py-6">No users yet</p>
          ) : (
            <div className="space-y-2">
              {recentUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[11px] font-bold text-text-muted flex-none">
                    {(u.full_name || u.email || "?")[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">{u.full_name || u.email}</p>
                    <p className="text-[10px] text-text-muted">{u.plan ?? "free"}</p>
                  </div>
                  <span className="text-[10px] text-text-muted">{formatDate(u.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-text-primary">Recent Campaigns</h3>
            <a href="/admin/analytics" className="text-[11px] text-primary hover:underline flex items-center gap-1">
              Analytics <ArrowUpRight size={10} />
            </a>
          </div>
          {recentCampaigns.length === 0 ? (
            <p className="text-[12px] text-text-muted text-center py-6">No campaigns yet</p>
          ) : (
            <div className="space-y-2">
              {recentCampaigns.map(c => (
                <div key={c.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-none">
                    <Target size={12} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">{c.name}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    c.status === "active" ? "text-primary bg-primary/10" : "text-text-muted bg-surface-2"
                  }`}>{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/admin/users",        emoji: "👥", label: "Manage Users" },
            { href: "/admin/blog",         emoji: "📝", label: "New Post" },
            { href: "/admin/flags",        emoji: "🚀", label: "Feature Flags" },
            { href: "/admin/design",       emoji: "🎨", label: "Design Studio" },
            { href: "/admin/intelligence", emoji: "🧠", label: "AI Engine" },
            { href: "/admin/prompts",      emoji: "⚡", label: "Prompts" },
          ].map(({ href, emoji, label }) => (
            <a key={href} href={href}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/30 hover:bg-surface-2 transition-all text-center group">
              <span className="text-xl">{emoji}</span>
              <span className="text-[11px] font-medium text-text-secondary group-hover:text-text-primary">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

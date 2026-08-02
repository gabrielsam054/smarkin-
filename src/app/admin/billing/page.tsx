import { requireAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { CreditCard, TrendingUp, Users, DollarSign, Package, CheckCircle } from "lucide-react";

export const metadata = { title: "Billing — Control Center" };

export default async function AdminBilling() {
  await requireAdmin();
  const supabase = await createClient();

  let profiles: { plan: string; credits_remaining: number }[] = [];
  try {
    const { data } = await supabase.from("profiles").select("plan, credits_remaining");
    profiles = (data ?? []) as { plan: string; credits_remaining: number }[];
  } catch { profiles = []; }

  const planCounts = (profiles ?? []).reduce((acc: Record<string, number>, p: { plan: string }) => {
    const plan = p.plan ?? "free";
    acc[plan] = (acc[plan] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const PLANS = [
    { id: "free",    label: "Free",    price: 0,    color: "text-text-muted", bg: "bg-surface-2",    border: "border-border" },
    { id: "starter", label: "Starter", price: 29,   color: "text-secondary",  bg: "bg-secondary/10", border: "border-secondary/25" },
    { id: "pro",     label: "Pro",     price: 79,   color: "text-primary",    bg: "bg-primary/10",   border: "border-primary/25" },
    { id: "agency",  label: "Agency",  price: 199,  color: "text-amber",      bg: "bg-amber/10",     border: "border-amber/25" },
  ];

  const totalMRR = PLANS.reduce((sum, p) => sum + (planCounts[p.id] || 0) * p.price, 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary">Billing</h1>
        <p className="text-sm text-text-muted mt-0.5">Plans, pricing, subscriptions and revenue</p>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "MRR", value: `GHS ${totalMRR.toLocaleString()}`, icon: TrendingUp, note: "Monthly recurring" },
          { label: "ARR", value: `GHS ${(totalMRR * 12).toLocaleString()}`, icon: DollarSign, note: "Annual run rate" },
          { label: "Paid Users", value: Object.entries(planCounts).filter(([k]) => k !== "free").reduce((s, [, v]) => s + (v as number), 0), icon: Users, note: "Active subscriptions" },
          { label: "Free Users", value: planCounts["free"] || 0, icon: Package, note: "On free plan" },
        ].map(({ label, value, icon: Icon, note }) => (
          <div key={label} className="card p-5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
              <Icon size={15} className="text-primary" />
            </div>
            <p className="text-2xl font-black text-text-primary">{value}</p>
            <p className="text-[11px] font-semibold text-text-primary mt-0.5">{label}</p>
            <p className="text-[10px] text-text-muted">{note}</p>
          </div>
        ))}
      </div>

      {/* Plan breakdown */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-text-primary mb-5">Plan Distribution</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(({ id, label, price, color, bg, border }) => {
            const count = planCounts[id] || 0;
            const total = (profiles ?? []).length || 1;
            const pct = Math.round((count / total) * 100);
            return (
              <div key={id} className={`rounded-xl p-4 border ${bg} ${border}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${color}`}>{label}</span>
                  <span className="text-[11px] text-text-muted">GHS {price}/mo</span>
                </div>
                <p className="text-2xl font-black text-text-primary">{count}</p>
                <p className="text-[11px] text-text-muted mb-2">users · {pct}%</p>
                <div className="h-1.5 bg-background/50 rounded-full overflow-hidden">
                  <div className="h-full bg-current rounded-full opacity-60 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Paystack config */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Payment Provider</h3>
        </div>
        <div className="flex items-center gap-4 p-4 bg-surface-2 rounded-xl border border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center flex-none text-lg">💳</div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-text-primary">Paystack</p>
            <p className="text-[11px] text-text-muted">Primary payment processor for GHS and other African currencies</p>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-primary">
            <CheckCircle size={12} /> Active
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 p-3 bg-surface-2 rounded-lg border border-border">
          <CheckCircle size={12} className="text-text-muted flex-none" />
          <span className="text-[11px] text-text-muted">Stripe will be available in the next billing update</span>
        </div>
      </div>
    </div>
  );
}

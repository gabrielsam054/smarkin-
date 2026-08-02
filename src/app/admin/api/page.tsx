import { requireAdmin } from "@/lib/admin";
import { Plug, Key, CheckCircle, AlertTriangle, ExternalLink } from "lucide-react";

export const metadata = { title: "API Center — Control Center" };

export default async function AdminAPI() {
  await requireAdmin();

  const INTEGRATIONS = [
    {
      name: "Anthropic (Claude)",
      key: "ANTHROPIC_API_KEY",
      desc: "Powers all AI analysis, audience intelligence, and creative scoring",
      status: "connected",
      docs: "https://docs.anthropic.com",
    },
    {
      name: "Meta Marketing API",
      key: "META_APP_ID / META_APP_SECRET",
      desc: "Connect user Meta Ad accounts for campaign publishing",
      status: "partial",
      docs: "https://developers.facebook.com",
    },
    {
      name: "Supabase",
      key: "NEXT_PUBLIC_SUPABASE_URL",
      desc: "Database, authentication, and file storage",
      status: "connected",
      docs: "https://supabase.com/docs",
    },
    {
      name: "Paystack",
      key: "PAYSTACK_SECRET_KEY",
      desc: "Payment processing for subscriptions and one-time purchases",
      status: "pending",
      docs: "https://paystack.com/docs",
    },
    {
      name: "Resend",
      key: "RESEND_API_KEY",
      desc: "Transactional emails — welcome, password reset, notifications",
      status: "pending",
      docs: "https://resend.com/docs",
    },
    {
      name: "Vercel",
      key: "Auto-configured",
      desc: "Deployment, edge functions, and environment variables",
      status: "connected",
      docs: "https://vercel.com/docs",
    },
  ];

  const STATUS_MAP = {
    connected: { label: "Connected", color: "text-primary", bg: "bg-primary/10", icon: CheckCircle },
    partial:   { label: "Partial",   color: "text-amber",   bg: "bg-amber/10",   icon: AlertTriangle },
    pending:   { label: "Pending",   color: "text-text-muted", bg: "bg-surface-2", icon: AlertTriangle },
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">API Center</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage all external API connections and integrations</p>
      </div>

      <div className="space-y-3">
        {INTEGRATIONS.map(({ name, key, desc, status, docs }) => {
          const s = STATUS_MAP[status as keyof typeof STATUS_MAP];
          const Icon = s.icon;
          return (
            <div key={name} className="card p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-none">
                <Plug size={16} className="text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <p className="text-[14px] font-semibold text-text-primary">{name}</p>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${s.bg} ${s.color}`}>
                    <Icon size={9} />{s.label}
                  </span>
                </div>
                <p className="text-[12px] text-text-muted mb-2">{desc}</p>
                <code className="text-[11px] text-text-secondary bg-surface-2 border border-border px-2 py-1 rounded font-mono">{key}</code>
              </div>
              <a href={docs} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-text-muted hover:text-primary transition-colors flex-none mt-1">
                Docs <ExternalLink size={10} />
              </a>
            </div>
          );
        })}
      </div>

      <div className="card p-5 mt-5 bg-surface-2">
        <div className="flex items-center gap-2 mb-3">
          <Key size={14} className="text-primary" />
          <h3 className="text-sm font-semibold text-text-primary">Environment Variables</h3>
        </div>
        <p className="text-[12px] text-text-muted mb-3">
          Set API keys in your Vercel dashboard under Settings → Environment Variables, or in your <code className="bg-surface border border-border px-1 rounded">.env.local</code> file.
        </p>
        <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary hover:underline">
          Open Vercel Dashboard <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}

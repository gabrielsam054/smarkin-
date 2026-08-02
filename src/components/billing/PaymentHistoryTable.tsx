import { CheckCircle, XCircle, Clock, RefreshCcw } from "lucide-react";
import type { PaymentRecord } from "@/lib/billing";
import { PLANS, formatPrice } from "@/lib/billing";

interface PaymentHistoryTableProps {
  payments: PaymentRecord[];
}

const STATUS_CONFIG = {
  success:  { Icon: CheckCircle, cls: "text-primary",     bg: "bg-primary/10 border-primary/20",     label: "Paid"     },
  failed:   { Icon: XCircle,     cls: "text-destructive", bg: "bg-destructive/10 border-destructive/20", label: "Failed"   },
  pending:  { Icon: Clock,       cls: "text-amber",       bg: "bg-amber/10 border-amber/20",          label: "Pending"  },
  refunded: { Icon: RefreshCcw,  cls: "text-text-muted",  bg: "bg-surface-2 border-border",           label: "Refunded" },
} as const;

export function PaymentHistoryTable({ payments }: PaymentHistoryTableProps) {
  if (!payments.length) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
          <Clock size={18} className="text-text-muted" />
        </div>
        <p className="text-sm font-medium text-text-primary mb-1">No payments yet</p>
        <p className="text-xs text-text-muted">Your payment history will appear here after your first purchase.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {payments.map((p) => {
        const cfg = STATUS_CONFIG[p.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
        const { Icon } = cfg;
        const planName = p.planId ? (PLANS[p.planId]?.name ?? p.planId) : "—";
        return (
          <div key={p.id} className="flex items-center gap-4 py-4 first:pt-0 last:pb-0">
            {/* Status icon */}
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center flex-none ${cfg.bg}`}>
              <Icon size={13} className={cfg.cls} />
            </div>

            {/* Plan + date */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary">{planName}</p>
              <p className="text-xs text-text-muted font-mono mt-0.5">
                {new Date(p.createdAt).toLocaleDateString("en-US", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </p>
            </div>

            {/* Reference */}
            <div className="hidden sm:block flex-none">
              <span className="font-mono text-[9px] text-text-muted bg-surface-2 border border-border rounded px-1.5 py-0.5">
                {p.reference.slice(0, 16)}…
              </span>
            </div>

            {/* Amount + status */}
            <div className="flex-none text-right">
              <p className="text-sm font-heading font-bold text-text-primary">
                {formatPrice(p.amount)}
              </p>
              <span className={`text-[9px] font-mono uppercase tracking-wider ${cfg.cls}`}>
                {cfg.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

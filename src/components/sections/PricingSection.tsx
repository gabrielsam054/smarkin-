import Link from "next/link";
import { CheckCircle, Zap } from "lucide-react";

const PLANS = [
  {
    name: "3-Day Access", price: "GHS 59.99", period: "one-time",
    description: "Perfect for testing Smarkin before committing.",
    features: ["20 audience analyses", "Full intelligence reports", "Campaign strategy", "AI creative ideas", "PDF export"],
    cta: "Start Trial", href: "/signup", highlight: false,
  },
  {
    name: "Pro", price: "GHS 285", period: "/month",
    description: "For serious marketers who run campaigns daily.",
    features: ["Unlimited analyses", "Priority AI processing", "All Pro features", "Advanced exports", "Email support"],
    cta: "Get Pro", href: "/signup", highlight: true,
  },
  {
    name: "Agency", price: "GHS 585", period: "/month",
    description: "For agencies managing multiple client accounts.",
    features: ["Everything in Pro", "Team workspaces", "Client reporting", "Bulk analysis", "Priority support"],
    cta: "Get Agency", href: "/signup", highlight: false,
  },
];

export function PricingSection() {
  return (
    <section className="section-padding border-t border-border" id="pricing">
      <div className="container-app">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-primary uppercase tracking-[3px] mb-3">Pricing</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">Simple, transparent pricing</h2>
          <p className="text-text-secondary">Start with 3-Day Access. Upgrade when you&apos;re ready.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {PLANS.map(({ name, price, period, description, features, cta, href, highlight }) => (
            <div key={name} className={`card p-6 flex flex-col ${highlight ? "border-primary/40 shadow-green" : ""}`}>
              {highlight && (
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={12} className="text-primary" />
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Most Popular</span>
                </div>
              )}
              <h3 className="font-bold text-text-primary text-lg mb-1">{name}</h3>
              <p className="text-text-muted text-xs mb-4">{description}</p>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-3xl font-black text-text-primary">{price}</span>
                <span className="text-text-muted text-sm">{period}</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                    <CheckCircle size={14} className="text-primary flex-none" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={href}
                className={`block text-center py-2.5 rounded-full text-sm font-semibold transition-all ${
                  highlight
                    ? "bg-primary text-primary-foreground shadow-green-btn hover:bg-primary-dim"
                    : "border border-border-strong text-text-primary hover:bg-surface-2"
                }`}>
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

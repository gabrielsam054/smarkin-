import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { PricingSection } from "@/components/sections/PricingSection";
import { CTASection } from "@/components/sections/CTASection";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple, transparent pricing. Start free with 3 reports, upgrade to Pro for unlimited access.",
};

const FAQ = [
  {
    q: "What happens after my 3 free reports?",
    a: "Once your free trial reports are used, you'll be prompted to upgrade to the Pro plan for unlimited access.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel your Pro subscription at any time — no questions asked, no penalties.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept all major credit cards and mobile money via Paystack.",
  },
  {
    q: "Is there a long-term contract?",
    a: "No. Smarkin AI is billed month-to-month. You can upgrade, downgrade, or cancel at any time.",
  },
  {
    q: "What does 'database-verified interests' mean?",
    a: "Smarkin AI only recommends Meta interests that actually exist in our verified Meta interest database — we never invent interests.",
  },
  {
    q: "Will future features be included?",
    a: "Yes. Pro subscribers get all future feature updates at no additional cost.",
  },
];

export default function PricingPage() {
  return (
    <>
      <PageHeader
        label="Pricing"
        title="Simple, transparent pricing"
        subtitle="Start free. Upgrade when you're ready. One plan, everything included."
      />
      <PricingSection />

      {/* FAQ */}
      <section className="section-padding">
        <div className="container-app max-w-3xl">
          <div className="text-center mb-12">
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-3xl font-heading font-bold text-text-primary">
              Frequently asked questions
            </h2>
          </div>
          <div className="divide-y divide-border">
            {FAQ.map((item) => (
              <div key={item.q} className="py-6">
                <h3 className="font-heading font-semibold text-text-primary mb-2">
                  {item.q}
                </h3>
                <p className="text-sm text-text-secondary leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}

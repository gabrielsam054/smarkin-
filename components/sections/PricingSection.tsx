"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { PRICING_TIERS } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface PricingSectionProps {
  showLabel?: boolean;
  className?: string;
}

export function PricingSection({ showLabel = true, className }: PricingSectionProps) {
  return (
    <section className={cn("section-padding", className)}>
      <div className="container-app">
        {showLabel && (
          <div className="text-center mb-16">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-4xl lg:text-5xl font-heading font-bold text-text-primary">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-text-secondary text-lg max-w-xl mx-auto">
              Start free, upgrade when you&apos;re ready. No hidden fees, no surprises.
            </p>
          </div>
        )}

        <div className="flex flex-col md:flex-row items-start justify-center gap-6 max-w-3xl mx-auto">
          {PRICING_TIERS.map((tier, i) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.4 }}
              className={cn("w-full md:w-80", tier.highlighted && "md:-mt-4")}
            >
              <div
                className={cn(
                  "relative rounded-2xl border p-8 flex flex-col",
                  tier.highlighted
                    ? "bg-surface border-primary/40 shadow-green"
                    : "bg-surface border-border"
                )}
              >
                {/* Badge */}
                {tier.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge variant="green" className="py-1 px-4">
                      {tier.badge}
                    </Badge>
                  </div>
                )}

                {/* Plan name */}
                <div className="mb-6">
                  <p className="font-mono text-xs tracking-[3px] uppercase text-text-muted mb-3">
                    {tier.name}
                  </p>
                  <div className="flex items-end gap-1">
                    {tier.price === "Free" ? (
                      <span className="text-4xl font-heading font-bold text-text-primary">
                        Free
                      </span>
                    ) : (
                      <>
                        <span className="text-xl font-heading font-bold text-text-secondary self-start mt-1">
                          $
                        </span>
                        <span className="text-5xl font-heading font-bold text-text-primary leading-none">
                          {tier.price}
                        </span>
                        <span className="text-text-muted text-sm mb-1">
                          /{tier.cycle}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{tier.description}</p>
                </div>

                {/* Features */}
                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check
                        size={15}
                        className={cn(
                          "mt-0.5 flex-none",
                          tier.highlighted ? "text-primary" : "text-text-secondary"
                        )}
                      />
                      <span className="text-sm text-text-secondary">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Button
                  variant={tier.highlighted ? "primary" : "outline"}
                  size="lg"
                  className="w-full"
                  asChild
                >
                  <Link href="/signup">{tier.cta}</Link>
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

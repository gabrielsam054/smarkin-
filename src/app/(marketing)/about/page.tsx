import type { Metadata } from "next";
import { Target, Lightbulb, Heart, Zap } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { CTASection } from "@/components/sections/CTASection";
import { SectionLabel } from "@/components/ui/SectionLabel";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Smarkin AI — our mission, vision, and why we built an AI audience intelligence engine for Meta advertisers.",
};

const VALUES = [
  {
    icon: Target,
    title: "Precision Over Guessing",
    description:
      "Every recommendation Smarkin AI makes is grounded in a proprietary knowledge database. We never invent interests, personas, or strategies.",
  },
  {
    icon: Lightbulb,
    title: "Intelligence, Not Features",
    description:
      "We built an intelligence engine — not another tool. The difference is reasoning. Smarkin AI thinks about your business before it recommends anything.",
  },
  {
    icon: Heart,
    title: "Built for Marketers",
    description:
      "Every feature was designed by people who have run Meta campaigns. We know what it feels like to waste budget on bad audiences.",
  },
  {
    icon: Zap,
    title: "Speed Without Sacrifice",
    description:
      "A complete audience intelligence report in minutes — not hours of manual research. Fast AND accurate.",
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeader
        label="About"
        title="We exist to end audience guessing"
        subtitle="Smarkin AI was built for Meta advertisers who are tired of wasting budget on audiences that don't convert."
      />

      {/* Story */}
      <section className="pb-20">
        <div className="container-app max-w-3xl">
          <div className="prose-custom space-y-5 text-text-secondary leading-relaxed text-base">
            <p>
              Meta advertising has a problem. Most advertisers — from freelancers
              to agencies — pick their audiences by gut instinct, copying competitors,
              or blindly testing broad interests. The result is wasted budget,
              low ROAS, and frustrated clients.
            </p>
            <p>
              We built Smarkin AI to solve this. Not with another interest finder.
              Not with a manual research tool. But with a true{" "}
              <span className="text-text-primary font-medium">
                audience intelligence engine
              </span>{" "}
              — one that analyzes your business using a 23-step reasoning process
              before it recommends a single interest, persona, or strategy.
            </p>
            <p>
              The engine is powered by a proprietary knowledge database that
              covers industries, product families, customer personas, buying
              motivations, Meta interests, campaign objectives, creative
              strategies, and more. Every recommendation is verified against
              this database. Nothing is invented.
            </p>
          </div>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="section-padding bg-surface/30">
        <div className="container-app">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            <div className="bg-surface border border-primary/20 rounded-2xl p-8">
              <SectionLabel className="justify-start">Mission</SectionLabel>
              <h3 className="text-2xl font-heading font-bold text-text-primary mb-4">
                Make intelligence accessible to every Meta advertiser
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                We believe every advertiser — regardless of budget or team size —
                deserves access to the same quality of audience intelligence that
                was previously only available to large agencies with dedicated
                research teams.
              </p>
            </div>
            <div className="bg-surface border border-secondary/20 rounded-2xl p-8">
              <SectionLabel className="justify-start">Vision</SectionLabel>
              <h3 className="text-2xl font-heading font-bold text-text-primary mb-4">
                A world where no Meta budget is wasted on the wrong audience
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                We envision a future where every Meta campaign starts with a
                complete intelligence report — not a guess. Where audiences are
                built on analysis, not intuition. Where every dollar spent on
                Meta has a reason behind it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="section-padding">
        <div className="container-app">
          <div className="text-center mb-16">
            <SectionLabel>Values</SectionLabel>
            <h2 className="text-4xl font-heading font-bold text-text-primary">
              What we stand for
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {VALUES.map((value) => {
              const Icon = value.icon;
              return (
                <Card key={value.title} hover>
                  <CardContent>
                    <div className="w-10 h-10 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-text-primary mb-2">
                      {value.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}

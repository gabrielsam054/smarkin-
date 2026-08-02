import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/PageHeader";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "Features",
  description: "Explore all Smarkin AI features — from AI audience analysis to creative recommendations and PDF reports.",
};

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        label="Features"
        title="Everything you need to win on Meta"
        subtitle="Smarkin AI is not an interest finder. It is an audience intelligence engine that analyzes your business before recommending anything."
      />
      <FeaturesSection />
      <HowItWorksSection />
      <CTASection />
    </>
  );
}

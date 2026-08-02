import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/HeroSection";
import { TrustedBySection } from "@/components/sections/TrustedBySection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { CTASection } from "@/components/sections/CTASection";

export const metadata: Metadata = {
  title: "AI Audience Intelligence For Meta Advertisers",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <TrustedBySection />
      <FeaturesSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}

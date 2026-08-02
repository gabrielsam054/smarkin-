import { ReservedCapabilityPage } from "@/components/domain/ReservedCapabilityPage";

export default function MarketingBrainPage() {
  return (
    <ReservedCapabilityPage
      activeLabel="Marketing Brain"
      title="Marketing Brain"
      description="See how Smarkin understands your business — the classifications, context, and reasoning behind every recommendation."
      activationCondition="Activates once Smarkin has classified your business and reasoned about at least one recommendation. Nothing reasoned about yet."
      checklist={["Business classification", "Reasoning chains behind recommendations", "Confidence sources"]}
    />
  );
}

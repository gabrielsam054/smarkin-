import { ReservedCapabilityPage } from "@/components/domain/ReservedCapabilityPage";

export default function PatternsPage() {
  return (
    <ReservedCapabilityPage
      activeLabel="Patterns"
      title="Patterns"
      description="Real, statistically-validated patterns Smarkin finds in your connected data — never a guess, always backed by real support."
      activationCondition="Patterns take real history to earn — Smarkin needs several weeks of connected data before it can validate its first one."
      checklist={["Validated only after real statistical support", "Every pattern shows its evidence", "Never presented as causal, only as observed"]}
    />
  );
}

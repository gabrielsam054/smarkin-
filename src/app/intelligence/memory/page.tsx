import { ReservedCapabilityPage } from "@/components/domain/ReservedCapabilityPage";

export default function MemoryPage() {
  return (
    <ReservedCapabilityPage
      activeLabel="Memory"
      title="Memory"
      description="What Smarkin remembers about your account — winning campaigns, audiences, and creative, built from confirmed outcomes."
      activationCondition="Memory is built from outcomes, not predictions — nothing has been confirmed yet."
      checklist={["Written only from confirmed results", "Used to inform future recommendations", "Decays over time — recent results matter more"]}
    />
  );
}

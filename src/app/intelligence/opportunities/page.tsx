import { ReservedCapabilityPage } from "@/components/domain/ReservedCapabilityPage";

export default function OpportunitiesPage() {
  return (
    <ReservedCapabilityPage
      activeLabel="Opportunities"
      title="Opportunities"
      description="A ranked queue of what to do next — each with its expected impact, confidence, and the evidence behind it."
      activationCondition="Opportunities appear once Smarkin is watching live campaign data. Connect a platform on the Integrations page to start."
      checklist={["Ranked by expected impact", "Confidence and evidence for every item", "Updates as new data arrives"]}
    />
  );
}

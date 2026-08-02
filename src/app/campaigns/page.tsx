import { ReservedCapabilityPage } from "@/components/domain/ReservedCapabilityPage";

export default function CampaignsPage() {
  return (
    <ReservedCapabilityPage
      activeLabel="Campaigns"
      title="Campaigns"
      description="Your real, synced campaigns from every connected platform — performance, budget, and AI diagnosis in one place."
      activationCondition="Appears once your connected platforms have synced real campaign data. Connect a platform on the Integrations page to start."
      checklist={["Real campaign structure and spend", "Performance synced automatically", "AI diagnosis of what's changing and why"]}
    />
  );
}

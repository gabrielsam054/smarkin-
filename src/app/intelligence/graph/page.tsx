import { ReservedCapabilityPage } from "@/components/domain/ReservedCapabilityPage";

export default function KnowledgeGraphPage() {
  return (
    <ReservedCapabilityPage
      activeLabel="Knowledge Graph"
      title="Knowledge Graph"
      description="A living map of how your business, customers, campaigns, and results connect to each other."
      activationCondition="Populates automatically as Smarkin's engines run and build real relationships — nothing mapped yet."
      checklist={["Business, product, and customer relationships", "Traceable path behind every recommendation", "Grows automatically, no manual setup"]}
    />
  );
}

import { Search } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export default function SeoPage() {
  return (
    <ComingSoonPage
      activeLabel="SEO"
      icon={Search}
      title="SEO Planner isn't built yet"
      description="No SEO Engine is registered in the Capability Registry today — this page will show real keyword plans and topic clusters once one exists, not sample data pretending it does."
    />
  );
}

import { FileEdit } from "lucide-react";
import { ComingSoonPage } from "@/components/layout/ComingSoonPage";

export default function ContentPage() {
  return (
    <ComingSoonPage
      activeLabel="Content"
      icon={FileEdit}
      title="Content Strategy isn't built yet"
      description="No Content Engine is registered in the Capability Registry today — this page will show a real content calendar and topic plan once one exists, not sample data pretending it does."
    />
  );
}

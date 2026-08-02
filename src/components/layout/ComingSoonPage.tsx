import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LucideIcon } from "lucide-react";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { EmptyState } from "@/components/shared/EmptyState";

/**
 * Shared scaffolding for any nav item pointing at a capability that
 * doesn't exist in the backend yet — SEO, Content Strategy, Analytics.
 * One real component instead of three near-identical page files, each
 * repeating the same auth check and shell wiring. When one of these
 * capabilities actually gets built (a real registered capability, its own
 * migration, its own service), its page stops calling this and gets a
 * real one, the same way Customer Research and Business Intelligence did.
 */
export async function ComingSoonPage({
  activeLabel, title, description, icon,
}: {
  activeLabel: string;
  title: string;
  description: string;
  icon: LucideIcon;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel={activeLabel}>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="card">
          <EmptyState icon={icon} title={title} description={description} />
        </div>
      </div>
    </AppShell>
  );
}

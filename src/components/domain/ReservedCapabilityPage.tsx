import { Lock } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";

/**
 * The full-page counterpart to ReservedSettingsSection (Feature 7),
 * for entire nav destinations rather than a section within Settings.
 * Same rule: state the real, specific activation condition, never a
 * vague "coming soon" — closes the gap where these routes previously
 * had no page at all and returned a raw 404 instead of this.
 */
export async function ReservedCapabilityPage({
  activeLabel, title, description, activationCondition, checklist,
}: {
  activeLabel: string;
  title: string;
  description: string;
  activationCondition: string;
  checklist?: string[];
}) {
  const { user, supabase } = await requireUser();
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel={activeLabel}>
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center py-16 px-6">
          <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
            <Lock size={18} className="text-text-muted" />
          </div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Not yet available</p>
          <h1 className="text-lg font-bold text-text-primary mb-2">{title}</h1>
          <p className="text-sm text-text-secondary max-w-md mb-4">{description}</p>

          {checklist && checklist.length > 0 && (
            <ul className="flex flex-col gap-1.5 mb-5 text-left">
              {checklist.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className="w-1 h-1 rounded-full bg-text-muted flex-none" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <p className="text-xs text-text-muted max-w-sm border-t border-border pt-4 mt-2">{activationCondition}</p>
        </div>
      </div>
    </AppShell>
  );
}

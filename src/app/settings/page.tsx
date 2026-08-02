import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { ReservedSettingsSection } from "@/components/settings/ReservedSettingsSection";

/**
 * Dogfoods requireUser() from Feature 2 — the first real page in this
 * project to use it instead of the duplicated inline check, per the
 * "clean follow-up" noted in that feature's log entry.
 *
 * Scope decision, stated plainly: of the 7 areas named in the
 * implementation order, only Profile has something real to build
 * against today. Billing and Audit Log already exist from earlier
 * sprints (linked here, not rebuilt). Workspace/Members/Roles/API
 * Keys/Notifications all depend on v16 tables that per the preflight
 * check are not live, or — for Roles specifically — on the
 * PermissionProvider RBAC work the 2.1 blueprint named as the single
 * biggest known gap (currently AllowAllPermissionProvider, a no-op).
 * Building forms for any of these would submit to nothing real or gate
 * nothing real — the exact class of placeholder this project has
 * refused everywhere else.
 */
export default async function SettingsPage() {
  const { user, supabase } = await requireUser("/settings");
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);

  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Settings">
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Settings</h1>
          <p className="text-sm text-text-secondary mt-1">Account, workspace, and platform configuration.</p>
        </div>

        <ProfileForm initialFirstName={firstName} />

        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/settings/billing"
            className="rounded-xl border border-border bg-surface p-4 hover:border-border-strong transition-colors flex items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-text-primary">Billing</p>
              <p className="text-xs text-text-muted mt-0.5">Plan, usage, payment method</p>
            </div>
            <ArrowRight size={14} className="text-text-muted flex-none" />
          </Link>

          {isAdmin && (
            <Link href="/admin/logs"
              className="rounded-xl border border-border bg-surface p-4 hover:border-border-strong transition-colors flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-text-primary">Audit Log</p>
                <p className="text-xs text-text-muted mt-0.5">Workspace activity history</p>
              </div>
              <ArrowRight size={14} className="text-text-muted flex-none" />
            </Link>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Not yet available</p>
          <ReservedSettingsSection
            title="Workspace"
            description="Rename your workspace, set defaults, and configure organization-level settings."
            activationCondition="Requires multi-tenancy (migration 023) — currently every account is a single implicit workspace."
          />
          <ReservedSettingsSection
            title="Members & Invitations"
            description="Invite teammates and manage who has access to this workspace."
            activationCondition="Requires multi-tenancy (migration 023) and the workspace_members table."
          />
          <ReservedSettingsSection
            title="Roles & Permissions"
            description="Assign owner/admin/member/viewer/client roles and fine-grained permissions."
            activationCondition="Requires a real permission provider — the current one grants all access unconditionally by design during this build phase, so role assignment would control nothing yet."
          />
          <ReservedSettingsSection
            title="API Keys"
            description="Generate and manage programmatic access keys."
            activationCondition="Requires the api_keys table and a v1 API surface, both scheduled for a later phase."
          />
          <ReservedSettingsSection
            title="Notifications"
            description="Choose which events notify you and how (digest-first, per the product design)."
            activationCondition="Requires the notifications/notification_preferences tables, scheduled alongside the Opportunity Engine phase."
          />
        </div>
      </div>
    </AppShell>
  );
}

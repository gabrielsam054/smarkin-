import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/AppShell";
import { Building2 } from "lucide-react";

const PENDING_SELECTION_COOKIE = "smarkin_pending_account_selection";

interface PendingSelection {
  connectorKey: string;
  workspaceId: string;
  accounts: Array<{ externalId: string; displayName: string }>;
}

/**
 * The real feature this project's OAuth flow was deliberately left
 * without: when Meta returns multiple ad accounts, this page lets the
 * user pick one explicitly instead of the system silently guessing —
 * reading the short-lived pending-selection cookie the callback route
 * wrote rather than re-running the OAuth dance (Meta already granted
 * access; this only resolves "which account").
 */
export default async function SelectAccountPage() {
  const { user } = await requireUser("/integrations/select-account");
  const supabase = await createClient();
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const cookieStore = await cookies();
  const raw = cookieStore.get(PENDING_SELECTION_COOKIE)?.value;

  // Expired or missing cookie — the 10-minute window closed, or the
  // user navigated here directly without going through Connect first.
  // Honest redirect back with a real explanation, not a dead page.
  if (!raw) {
    redirect("/integrations?connect_error=selection_expired");
  }

  const parsed = (() => {
    try {
      return JSON.parse(raw) as PendingSelection;
    } catch {
      return null;
    }
  })();

  if (!parsed) {
    redirect("/integrations?connect_error=selection_expired");
  }
  // Explicit assertion, not left implicit: redirect() truly does
  // interrupt execution at runtime (Next.js throws internally), but
  // relying on TypeScript inferring that from redirect()'s `never`
  // return type is fragile across environments — stated directly here
  // instead.
  const pending = parsed!;

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Integrations">
      <div className="p-4 sm:p-6 lg:p-8 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Choose an ad account</h1>
          <p className="text-sm text-text-secondary mt-1">
            This Meta login has access to {pending.accounts.length} ad accounts. Pick the one you want Smarkin to connect.
          </p>
        </div>

        <form action="/api/v1/connectors/select-account" method="POST" className="flex flex-col gap-3">
          {pending.accounts.map((acc) => (
            <button
              key={acc.externalId}
              type="submit"
              name="externalId"
              value={acc.externalId}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 text-left hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center flex-none">
                <Building2 size={15} className="text-text-muted" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{acc.displayName}</p>
                <p className="text-xs text-text-muted font-mono">{acc.externalId}</p>
              </div>
            </button>
          ))}
        </form>
      </div>
    </AppShell>
  );
}

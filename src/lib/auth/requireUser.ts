import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import type { User } from "@supabase/supabase-js";

/**
 * Replaces the pattern duplicated across every real page in this
 * project:
 *
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) redirect("/login");
 *
 * Direct fix for "No duplicated logic" (Development Standards). Existing
 * pages are NOT required to migrate immediately — this is additive, not
 * a breaking change to `lib/supabase/server.ts` or any page — but new
 * pages should use this going forward, and migrating existing pages is
 * a safe, mechanical follow-up whenever one is next touched.
 *
 * Preserves the `redirectTo` intent set by middleware.ts: if this fires
 * on a page middleware didn't catch (e.g. a client-side navigation that
 * bypassed it), it still sends the user back to /login with the correct
 * return path rather than silently dropping their destination.
 */
export async function requireUser(currentPath?: string): Promise<{
  user: User;
  supabase: Awaited<ReturnType<typeof createClient>>;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const target = currentPath ? `/login?redirectTo=${encodeURIComponent(currentPath)}` : "/login";
    redirect(target);
  }

  return { user, supabase };
}

/**
 * For admin-only pages/actions. Redirects non-admins to Mission Control
 * rather than /login (they ARE authenticated — the failure is
 * authorization, not authentication, and those deserve different
 * destinations: a logged-out user needs to log in; a logged-in user
 * without permission needs to go somewhere they're actually allowed).
 */
export async function requireAdmin(currentPath?: string) {
  const { user, supabase } = await requireUser(currentPath);
  const isAdmin = await isCurrentUserAdmin();

  if (!isAdmin) {
    redirect("/dashboard");
  }

  return { user, supabase, isAdmin: true as const };
}

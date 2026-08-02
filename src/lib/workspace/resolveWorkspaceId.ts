import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Closes the "placeholder correlation" gap flagged repeatedly since
 * Feature 6 and never fixed: every connector route was writing
 * user.id directly as workspace_id, which only ever worked by
 * coincidence — platform_accounts.workspace_id has a real foreign key
 * to workspaces(id), so this was always going to fail the moment that
 * constraint could actually be checked against real data. It stayed
 * silent until now because no workspaces existed at all until the v16
 * migration ran.
 *
 * Returns null (not a thrown error) when the user has no workspace yet
 * — callers decide what that means for them (usually: tell the user
 * their workspace setup isn't complete, not a generic backend error).
 */
export async function resolveWorkspaceId(
  userId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data.workspace_id;
}

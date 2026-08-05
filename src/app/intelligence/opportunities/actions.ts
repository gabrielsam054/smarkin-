"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { buildServiceRoleClient } from "@/lib/supabase/serviceClient";

/**
 * Caught before shipping, not after: opportunities is service-role-only
 * for writes (same design as platform_accounts/oauth_tokens), and this
 * action's first draft used requireUser()'s regular session client for
 * the update — the exact class of silent-no-op bug already found and
 * fixed twice this session (the OAuth callback, the disconnect route).
 * requireUser() still confirms who's asking and resolves their real
 * workspace (a read, which member-read policy allows); the actual
 * write goes through service role.
 */
export async function dismissOpportunity(opportunityId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser("/intelligence/opportunities");

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  if (!workspaceId) return { error: "Workspace not set up." };

  const serviceClient = buildServiceRoleClient();
  if (!serviceClient) return { error: "Service temporarily unavailable." };

  const { error } = await serviceClient
    .from("opportunities")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", opportunityId)
    .eq("workspace_id", workspaceId); // still real ownership scoping, just via service role

  if (error) return { error: "Couldn't dismiss — please try again." };

  revalidatePath("/intelligence/opportunities");
  return {};
}

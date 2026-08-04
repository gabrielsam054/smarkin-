"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";

/**
 * The real link this feature depends on — always an explicit user
 * choice, never inferred from name-matching (a campaign named "Q3
 * Retargeting" tells you nothing about what product it's selling;
 * fuzzy-matching that against a researched business name would be
 * exactly the kind of confident-looking-but-unfounded claim this
 * project has refused everywhere else).
 */
export async function linkPlatformAccount(productName: string, platformAccountId: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser("/intelligence/brain");

  // Ownership check before linking anything — the chosen account must
  // actually belong to this user's real workspace, not an arbitrary id
  // a client could submit.
  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  if (!workspaceId) return { error: "Workspace not set up." };

  const { data: account } = await supabase
    .from("platform_accounts")
    .select("id")
    .eq("id", platformAccountId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!account) return { error: "That account doesn't belong to your workspace." };

  const { error } = await supabase
    .from("business_intelligence_profiles")
    .update({ linked_platform_account_id: platformAccountId })
    .eq("user_id", user.id)
    .eq("product_name", productName);

  if (error) return { error: "Couldn't save the link — please try again." };

  revalidatePath("/intelligence/brain");
  return {};
}

export async function unlinkPlatformAccount(productName: string): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser("/intelligence/brain");

  const { error } = await supabase
    .from("business_intelligence_profiles")
    .update({ linked_platform_account_id: null })
    .eq("user_id", user.id)
    .eq("product_name", productName);

  if (error) return { error: "Couldn't remove the link — please try again." };

  revalidatePath("/intelligence/brain");
  return {};
}

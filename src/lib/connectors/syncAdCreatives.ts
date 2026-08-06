import { SupabaseClient } from "@supabase/supabase-js";
import { decryptToken } from "@/lib/crypto/tokenEncryption";

const GRAPH_API_VERSION = "v21.0";

/**
 * Real ad/creative data — the first entity in this connector layer
 * below campaigns. Scoped deliberately narrow: headline, body, image
 * URL, CTA, status. No AI scoring, no fatigue detection, no
 * performance-per-creative yet — those are real, separate follow-ups,
 * not attempted here per the explicit architecture discussion before
 * this was built.
 *
 * Best-effort, run after the main sync — a failure here never risks
 * the core metrics sync's own already-confirmed success.
 */
export async function syncAdCreatives(supabase: SupabaseClient, platformAccountId: string): Promise<void> {
  const { data: account } = await supabase
    .from("platform_accounts")
    .select("id, workspace_id, external_account_id")
    .eq("id", platformAccountId)
    .single();

  if (!account) return;

  const { data: tokenRow } = await supabase
    .from("oauth_tokens")
    .select("enc_access_token")
    .eq("platform_account_id", platformAccountId)
    .maybeSingle();

  if (!tokenRow?.enc_access_token) return;

  const accessToken = decryptToken(Buffer.from(tokenRow.enc_access_token.replace(/^\\x/, ""), "hex"));

  // Real campaign lookup — external Meta campaign_id -> internal
  // campaign_entities.id, the same mapping pattern already proven for
  // linking opportunities and briefing priorities to their campaigns.
  const { data: campaignRows } = await supabase
    .from("campaign_entities").select("id, external_id")
    .eq("platform_account_id", platformAccountId).eq("kind", "campaign");
  const campaignIdByExternalId = new Map((campaignRows ?? []).map((c) => [c.external_id, c.id]));

  try {
    const adsUrl = new URL(`https://graph.facebook.com/${GRAPH_API_VERSION}/act_${account.external_account_id}/ads`);
    adsUrl.searchParams.set("access_token", accessToken);
    adsUrl.searchParams.set("fields", "id,name,campaign_id,status,creative{title,body,image_url,thumbnail_url,call_to_action_type}");

    const res = await fetch(adsUrl.toString());
    if (!res.ok) {
      console.error(`[ad-sync] ads fetch returned ${res.status} for platform_account ${platformAccountId} — continuing without creative data this run.`);
      return;
    }

    const body = await res.json() as {
      data: Array<{
        id: string; name?: string; campaign_id: string; status?: string;
        creative?: { title?: string; body?: string; image_url?: string; thumbnail_url?: string; call_to_action_type?: string };
      }>
    };

    const adEntities = body.data.map((ad) => ({
      workspace_id: account.workspace_id,
      platform_account_id: platformAccountId,
      campaign_entity_id: campaignIdByExternalId.get(ad.campaign_id) ?? null,
      external_id: ad.id,
      name: ad.name ?? null,
      headline: ad.creative?.title ?? null,
      body: ad.creative?.body ?? null,
      image_url: ad.creative?.image_url ?? null,
      thumbnail_url: ad.creative?.thumbnail_url ?? null,
      cta_type: ad.creative?.call_to_action_type ?? null,
      status: ad.status ?? null,
      synced_at: new Date().toISOString(),
    }));

    if (adEntities.length > 0) {
      const { error } = await supabase.from("ad_entities").upsert(adEntities, { onConflict: "platform_account_id,external_id" });
      if (error) {
        console.error(`[ad-sync] failed to upsert ad_entities for platform_account ${platformAccountId} (table may not exist yet):`, error.message);
      }
    }
  } catch (err) {
    console.error(`[ad-sync] ads fetch failed for platform_account ${platformAccountId}, continuing without it:`, err);
  }
}

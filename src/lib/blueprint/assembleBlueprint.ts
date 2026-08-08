import { SupabaseCustomerResearchRepository } from "@/lib/capabilities/customerResearch/repository/supabaseCustomerResearchRepository";
import { SupabaseAudienceResearchRepository } from "@/lib/capabilities/audienceResearch/repository/supabaseAudienceResearchRepository";
import { AudienceRecommendation, PlatformRecommendation, TargetingStrategy } from "@/lib/capabilities/audienceResearch/types";
import { RecommendedMessaging } from "@/lib/capabilities/customerResearch/types";
import { findProductIntelligenceMatch, ProductIntelligenceMatch } from "./productIntelligence";
import { SupabaseClient } from "@supabase/supabase-js";

export interface BlueprintData {
  productName: string;
  hasCustomerResearch: boolean;
  hasAudienceResearch: boolean;
  hasMarketingBrain: boolean;
  industry: string | null;
  personas: Array<{ name: string; primaryGoal: string; ageRange: string | null; buyingPower: string }>;
  painPoints: string[];
  recommendedMessaging: RecommendedMessaging | null;
  demographics: { ageRanges: string[]; occupations: string[]; incomeLevel: string[] } | null;
  primaryAudiences: AudienceRecommendation[];
  platformRecommendations: PlatformRecommendation[];
  targetingStrategies: TargetingStrategy[];
  audienceGaps: string[];
  customerGaps: string[];
  productIntelligence: ProductIntelligenceMatch | null;
}

/**
 * Real "Launch" per the Phase 1 product decision: this assembles a
 * genuine campaign blueprint from existing, real research engines —
 * never a Meta API call, never spends real money, never writes
 * anything to Meta at all. Human remains the one who takes this into
 * Meta Ads Manager and actually creates the campaign.
 *
 * Deliberately reuses the existing SupabaseCustomerResearchRepository
 * and SupabaseAudienceResearchRepository classes directly rather than
 * writing new raw queries — this is genuinely sophisticated,
 * pre-existing infrastructure (personas, messaging, targeting
 * strategies, platform recommendations) that already exists and
 * already follows the same "log the gap, never fabricate" discipline
 * this whole connector has followed all session.
 *
 * Does NOT include specific creative/ad copy — no creative-writing AI
 * capability exists in this system (a deliberate, explicit decision
 * made earlier when Creative Intelligence was scoped). The blueprint
 * page states this plainly rather than inventing copy to fill the
 * section.
 */
export async function assembleBlueprint(
  supabase: SupabaseClient,
  userId: string,
  productName: string
): Promise<BlueprintData> {
  const customerRepo = new SupabaseCustomerResearchRepository();
  const audienceRepo = new SupabaseAudienceResearchRepository();

  const [customerAsset, audienceAsset, brainProfile] = await Promise.all([
    customerRepo.findLatest(userId, productName),
    audienceRepo.findLatest(userId, productName),
    supabase.from("business_intelligence_profiles").select("product_profile").eq("user_id", userId).eq("product_name", productName).maybeSingle(),
  ]);

  const productProfile = brainProfile.data?.product_profile as { industry?: string } | undefined;

  return {
    productName,
    hasCustomerResearch: !!customerAsset,
    hasAudienceResearch: !!audienceAsset,
    hasMarketingBrain: !!brainProfile.data,
    industry: productProfile?.industry ?? null,
    personas: customerAsset?.result.customerPersonas.map((p) => ({ name: p.name, primaryGoal: p.primaryGoal, ageRange: p.ageRange, buyingPower: p.buyingPower })) ?? [],
    painPoints: customerAsset?.result.painPoints.map((p) => p.description) ?? [],
    recommendedMessaging: customerAsset?.result.recommendedMessaging ?? null,
    demographics: customerAsset?.result.demographics ?? null,
    primaryAudiences: audienceAsset?.result.primaryAudiences ?? [],
    platformRecommendations: audienceAsset?.result.platformRecommendations ?? [],
    targetingStrategies: audienceAsset?.result.targetingStrategies ?? [],
    audienceGaps: audienceAsset?.result.gaps ?? [],
    customerGaps: customerAsset?.result.gaps ?? [],
    productIntelligence: findProductIntelligenceMatch(productName),
  };
}

import { createClient } from "@/lib/supabase/server";
import { AudienceResearchRepository } from "./audienceResearchRepository";
import { AudienceResearchAsset } from "../domain/audienceResearchAsset";

interface AudienceResearchRow {
  id: string;
  user_id: string;
  business_id: string;
  version_number: number;
  source_data_version: string;
  primary_audiences: unknown;
  secondary_audiences: unknown;
  targeting_strategies: unknown;
  platform_recommendations: unknown;
  audience_insights: unknown;
  evidence: unknown;
  confidence: number;
  gaps: unknown;
  created_at: string;
  updated_at: string;
}

function rowToAsset(row: AudienceResearchRow): AudienceResearchAsset {
  return {
    id: row.id,
    userId: row.user_id,
    businessId: row.business_id,
    versionNumber: row.version_number,
    researchLogicVersion: "1.0.0", // this repository always writes the current logic version — no separate DB column needed, matching only what's actually stored
    sourceDataVersion: row.source_data_version,
    result: {
      businessId: row.business_id,
      confidence: row.confidence,
      primaryAudiences: row.primary_audiences,
      secondaryAudiences: row.secondary_audiences,
      targetingStrategies: row.targeting_strategies,
      platformRecommendations: row.platform_recommendations,
      audienceInsights: row.audience_insights,
      evidence: row.evidence,
      gaps: row.gaps,
      metadata: { version: row.version_number, generatedAt: row.created_at },
      researchId: row.id,
    } as unknown as AudienceResearchAsset["result"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseAudienceResearchRepository implements AudienceResearchRepository {
  async findLatest(userId: string, businessId: string): Promise<AudienceResearchAsset | null> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audience_research")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle<AudienceResearchRow>();

    if (error) {
      console.error("[SupabaseAudienceResearchRepository] findLatest failed:", error.message);
      return null;
    }
    return data ? rowToAsset(data) : null;
  }

  async findVersions(userId: string, businessId: string): Promise<AudienceResearchAsset[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audience_research")
      .select("*")
      .eq("user_id", userId)
      .eq("business_id", businessId)
      .order("version_number", { ascending: false });

    if (error) {
      console.error("[SupabaseAudienceResearchRepository] findVersions failed:", error.message);
      return [];
    }
    return (data as AudienceResearchRow[] ?? []).map(rowToAsset);
  }

  async save(asset: AudienceResearchAsset): Promise<AudienceResearchAsset> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("audience_research")
      .insert({
        user_id: asset.userId,
        business_id: asset.businessId,
        version_number: asset.versionNumber,
        source_data_version: asset.sourceDataVersion,
        primary_audiences: asset.result.primaryAudiences,
        secondary_audiences: asset.result.secondaryAudiences,
        targeting_strategies: asset.result.targetingStrategies,
        platform_recommendations: asset.result.platformRecommendations,
        audience_insights: asset.result.audienceInsights,
        evidence: asset.result.evidence,
        confidence: asset.result.confidence,
        gaps: asset.result.gaps,
      })
      .select()
      .single<AudienceResearchRow>();

    if (error || !data) {
      console.error("[SupabaseAudienceResearchRepository] save failed:", error?.message);
      return asset; // caller (the service) must treat an unpersisted asset as a real failure, same fix already applied to Customer Research
    }
    return rowToAsset(data);
  }
}

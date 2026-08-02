import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CampaignWorkspace } from "./CampaignWorkspace";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("campaigns").select("name").eq("id", id).single();
  return { title: `${data?.name ?? "Campaign"} — Smarkin AI Workspace` };
}

export default async function CampaignWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!campaign) notFound();

  const [
    { data: audiences },
    { data: creatives },
    { data: decisions },
  ] = await Promise.all([
    supabase.from("campaign_audiences").select("*").eq("campaign_id", id).order("created_at"),
    supabase.from("campaign_creatives").select("*").eq("campaign_id", id).order("created_at", { ascending: false }),
    supabase.from("campaign_decisions").select("*").eq("campaign_id", id).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <CampaignWorkspace
      campaign={campaign}
      audiences={audiences ?? []}
      creatives={creatives ?? []}
      decisions={decisions ?? []}
    />
  );
}

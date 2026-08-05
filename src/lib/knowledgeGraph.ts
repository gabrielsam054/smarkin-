import { SupabaseClient } from "@supabase/supabase-js";

export interface GraphNode {
  id: string;
  type: "business" | "platform_account" | "campaign" | "opportunity" | "decision";
  label: string;
  meta?: string;
}
export interface GraphEdge { source: string; target: string }
export interface KnowledgeGraph { nodes: GraphNode[]; edges: GraphEdge[] }

/**
 * Every edge here traces to a real foreign key or explicit user-set
 * link already in the database — nothing inferred from text similarity
 * or guessed. business_intelligence_profiles.linked_platform_account_id
 * (an explicit user action from the Marketing Brain page) is the only
 * business->account edge; everything downstream of that follows real
 * FKs (platform_account_id, related_campaign_external_id, product_name
 * matching on decision_requests, which was itself only added because
 * it was confirmed missing earlier this session).
 */
export async function buildKnowledgeGraph(supabase: SupabaseClient, userId: string, workspaceId: string): Promise<KnowledgeGraph> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  const { data: profiles } = await supabase
    .from("business_intelligence_profiles")
    .select("product_name, linked_platform_account_id")
    .eq("user_id", userId);

  const { data: accounts } = await supabase
    .from("platform_accounts")
    .select("id, display_name, external_id, connector_key")
    .eq("workspace_id", workspaceId);

  const { data: campaigns } = await supabase
    .from("campaign_entities")
    .select("id, external_id, name, platform_account_id")
    .eq("workspace_id", workspaceId).eq("kind", "campaign");

  const { data: opportunities } = await supabase
    .from("opportunities")
    .select("id, title, opportunity_type, related_campaign_external_id")
    .eq("workspace_id", workspaceId).eq("status", "open");

  const { data: decisions } = await supabase
    .from("decision_requests")
    .select("id, product_name, industry")
    .eq("user_id", userId);

  for (const p of profiles ?? []) {
    const businessNodeId = `business:${p.product_name}`;
    nodes.push({ id: businessNodeId, type: "business", label: p.product_name });

    if (p.linked_platform_account_id) {
      const account = (accounts ?? []).find((a) => a.id === p.linked_platform_account_id);
      if (account) {
        const accountNodeId = `account:${account.id}`;
        if (!nodes.some((n) => n.id === accountNodeId)) {
          nodes.push({ id: accountNodeId, type: "platform_account", label: account.display_name || account.external_id, meta: account.connector_key });
        }
        edges.push({ source: businessNodeId, target: accountNodeId });

        for (const c of (campaigns ?? []).filter((c) => c.platform_account_id === account.id)) {
          const campaignNodeId = `campaign:${c.id}`;
          nodes.push({ id: campaignNodeId, type: "campaign", label: c.name });
          edges.push({ source: accountNodeId, target: campaignNodeId });

          for (const o of (opportunities ?? []).filter((o) => o.related_campaign_external_id === c.external_id)) {
            const oppNodeId = `opportunity:${o.id}`;
            nodes.push({ id: oppNodeId, type: "opportunity", label: o.opportunity_type.replace(/_/g, " ") });
            edges.push({ source: campaignNodeId, target: oppNodeId });
          }
        }
      }
    }

    for (const d of (decisions ?? []).filter((d) => d.product_name === p.product_name)) {
      const decisionNodeId = `decision:${d.id}`;
      nodes.push({ id: decisionNodeId, type: "decision", label: d.industry || "Decision" });
      edges.push({ source: businessNodeId, target: decisionNodeId });
    }
  }

  return { nodes, edges };
}

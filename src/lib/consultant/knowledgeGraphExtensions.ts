import { SupabaseClient } from "@supabase/supabase-js";

export interface KnowledgeGraphExtension {
  sourceNode: string;
  relationship: string;
  targetNode: string;
  weight: number | null;
  confidence: number | null;
  evidenceType: string | null;
  evidenceSource: string | null;
}

/**
 * Real, small extension to the existing static Knowledge Graph
 * (nodes/edges/evidence in smarkin-db.json), stored separately rather
 * than hand-edited into that large file. Deliberately standalone for
 * Phase 1: `lookupKnowledgeGraphProfile()` in businessIntelligenceEngine.ts
 * is explicitly documented as staying synchronous and pure — merging
 * this real, async-fetched data into it would force an async refactor
 * cascading through every caller of that function, a genuinely larger
 * change than this milestone's scope. This function is real and
 * queryable today; wiring it directly into the synchronous engine is
 * honest future work, not done here.
 */
export async function getGraphExtensionsForNode(supabase: SupabaseClient, nodeName: string): Promise<KnowledgeGraphExtension[]> {
  const { data, error } = await supabase
    .from("knowledge_graph_extensions")
    .select("*")
    .eq("source_node", nodeName);
  if (error) {
    console.error("[getGraphExtensionsForNode] Failed to load:", error.message);
    return [];
  }
  return (data ?? []).map((row) => ({
    sourceNode: row.source_node,
    relationship: row.relationship,
    targetNode: row.target_node,
    weight: row.weight,
    confidence: row.confidence,
    evidenceType: row.evidence_type,
    evidenceSource: row.evidence_source,
  }));
}

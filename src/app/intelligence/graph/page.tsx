import { Share2 } from "lucide-react";
import { requireUser } from "@/lib/auth/requireUser";
import { isCurrentUserAdmin } from "@/lib/admin";
import { resolveWorkspaceId } from "@/lib/workspace/resolveWorkspaceId";
import { buildKnowledgeGraph, GraphNode } from "@/lib/knowledgeGraph";
import { AppShell } from "@/components/layout/AppShell";

const TYPE_COLOR: Record<GraphNode["type"], string> = {
  business: "#7C3AED", platform_account: "#0EA5E9", campaign: "#10B981",
  opportunity: "#F59E0B", decision: "#EC4899",
};
const TYPE_ORDER: GraphNode["type"][] = ["business", "platform_account", "campaign", "opportunity", "decision"];
const COLUMN_WIDTH = 180;
const ROW_HEIGHT = 56;

/**
 * The real Knowledge Graph — every node and edge here traces to an
 * actual database row and an actual foreign key or explicit user link,
 * assembled in knowledgeGraph.ts. Simple column-by-type SVG layout,
 * deliberately not a force-directed graph library — genuinely
 * unnecessary complexity for what's currently a small, real number of
 * nodes, and a real, readable layout beats an impressive-looking one
 * that obscures what's actually connected to what.
 */
export default async function KnowledgeGraphPage() {
  const { user, supabase } = await requireUser("/intelligence/graph");
  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  const workspaceId = await resolveWorkspaceId(user.id, supabase);
  const graph = workspaceId ? await buildKnowledgeGraph(supabase, user.id, workspaceId) : { nodes: [], edges: [] };

  // Real positions, computed from real grouping - not hardcoded, not fabricated
  const positions = new Map<string, { x: number; y: number }>();
  const columnCounts: Record<string, number> = {};
  for (const node of graph.nodes) {
    const col = TYPE_ORDER.indexOf(node.type);
    const row = columnCounts[node.type] ?? 0;
    positions.set(node.id, { x: col * COLUMN_WIDTH + 90, y: row * ROW_HEIGHT + 50 });
    columnCounts[node.type] = row + 1;
  }
  const maxRows = Math.max(1, ...Object.values(columnCounts));
  const svgHeight = maxRows * ROW_HEIGHT + 60;
  const svgWidth = TYPE_ORDER.length * COLUMN_WIDTH;

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Knowledge Graph">
      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Knowledge Graph</h1>
          <p className="text-sm text-text-secondary mt-1">How your business, accounts, campaigns, and findings actually connect — every link here is a real relationship, not inferred.</p>
        </div>

        {graph.nodes.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 rounded-xl border border-border bg-surface">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-border flex items-center justify-center mb-4">
              <Share2 size={18} className="text-text-muted" />
            </div>
            <p className="font-semibold text-text-primary text-sm mb-1.5">Nothing connected yet</p>
            <p className="text-sm text-text-secondary max-w-sm">
              Research a business, link it to a connected account on Marketing Brain, and real relationships will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="card p-5 overflow-x-auto">
            <svg width={svgWidth} height={svgHeight} className="min-w-full">
              {graph.edges.map((edge, i) => {
                const from = positions.get(edge.source);
                const to = positions.get(edge.target);
                if (!from || !to) return null;
                return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="var(--border, #E2E8F0)" strokeWidth={1.5} />;
              })}
              {graph.nodes.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;
                return (
                  <g key={node.id}>
                    <circle cx={pos.x} cy={pos.y} r={6} fill={TYPE_COLOR[node.type]} />
                    <text x={pos.x} y={pos.y + 20} textAnchor="middle" fontSize={10} fill="var(--text-secondary, #475569)" className="font-mono">
                      {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
            <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
              {TYPE_ORDER.map((type) => (
                <div key={type} className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[type] }} />
                  {type.replace(/_/g, " ")}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/**
 * Smarkin AI — Marketing Reasoning Engine
 *
 * Bridges qualitative customer understanding (persona, objections, psychology)
 * to the Decision Engine's quantitative scoring. This service NEVER picks a
 * winner — it only produces adjustments that decisionEngine.ts still runs
 * through its own ranking logic. That boundary is deliberate: without it,
 * this quietly becomes a second decision engine and the architecture stops
 * making sense.
 *
 * Two of the three lookups here are genuine relational data (verified against
 * real rows, same discipline as the rest of the engine). The third — mapping
 * a persona's objection text to a Buying Barrier category, and inferring
 * relevant psychology principles from a persona's motivation text — is a
 * keyword heuristic, clearly marked as such below, because no direct
 * relational link between personas and buying-barrier categories or
 * psychology principles exists in the database yet. Flagging that honestly
 * rather than presenting it with the same confidence as a verified lookup.
 */
import DB_RAW from "./smarkin-db.json";

type Row = Record<string, unknown>;
const DB_ANY = DB_RAW as unknown as Record<string, Row[] | undefined>;

const EDGES = (DB_ANY["edges"] ?? []) as Row[];
const BUYING_BARRIERS  = (DB_ANY["buyingbarriers"]  ?? []) as Row[];
const BUYING_SOLUTIONS = (DB_ANY["buyingsolutions"] ?? []) as Row[];
const PSYCHOLOGY_CHANNEL_AFFINITY = (DB_ANY["psychologyChannelAffinity"] ?? []) as Row[];
const PERSONAS = (DB_ANY["customerPersonaDatabase"] ?? []) as Row[];

function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }

export interface ChannelAffinityAdjustment {
  channel: string;
  adjustment: number;
  reasoning: string;
}

export interface MarketingReasoningSignal {
  favoredOpportunityTypes: string[];
  disfavoredOpportunityTypes: string[];
  channelAffinityAdjustments: ChannelAffinityAdjustment[];
  messagingGuidance: string[];
  reasoningNotes: string[];
  confidence: "High" | "Medium" | "Low";
}

// ── Real relational lookup #1: persona objections, from the Knowledge Graph ───
function getObjectionsForPersona(personaName: string): string[] {
  return EDGES
    .filter(e => e["Relationship"] === "HAS_OBJECTION" && s(e["Source"]) === s(personaName))
    .map(e => str(e["Target"]));
}

// ── Heuristic #1 (flagged): objection text -> Buying Barrier category ─────────
// No direct relational link exists between free-text persona objections and
// the 9 Buying Barrier categories, so this maps by keyword. Each mapping is
// intentionally narrow rather than a loose catch-all, to avoid the exact
// "generic word matches everything" bug found and fixed twice already this
// session (Consumer Classification, "Any local business").
const OBJECTION_KEYWORDS: Record<string, string[]> = {
  "price":       ["expensive", "cost", "afford", "worth it", "price"],
  "trust":       ["reliab", "trust", "work?", "doesn't work", "sure if", "scam", "authentic"],
  "complexity":  ["complicated", "difficult", "too hard", "overwhelm", "confus"],
  "time":        ["no time", "too long", "takes too long", "busy"],
  "risk":        ["risk", "afraid", "worried about losing", "commitment"],
  "lack of information": ["not sure", "don't know", "unclear", "need more info"],
  "poor reviews": ["reviews", "bad experience", "heard bad"],
};

function classifyObjection(objectionText: string): Row | null {
  const t = s(objectionText);
  for (const [barrier, keywords] of Object.entries(OBJECTION_KEYWORDS)) {
    if (keywords.some(k => t.includes(k))) {
      return BUYING_BARRIERS.find(b => s(b["Node Name"]) === barrier) ?? null;
    }
  }
  return null; // honestly unclassified — not forced into a wrong bucket
}

// ── Heuristic #2 (flagged): persona motivation/pain-point text ->
//    relevant psychology principles. No direct relational link exists yet
//    between personas and marketingPsychologyDatabase principles either. ──────
const MOTIVATION_KEYWORDS: Record<string, string[]> = {
  "social proof":    ["everyone", "trusted by", "join", "community"],
  "trust signals":   ["reliab", "trust", "confidence", "peace of mind"],
  "loss aversion":   ["worried", "afraid", "avoid", "don't miss", "risk"],
  "identity signaling": ["style", "identity", "status", "confidence", "who i am"],
  "authority":       ["expert", "professional", "credential", "proven"],
  "urgency":         ["now", "today", "quickly", "fast"],
};

function inferPsychologyPrinciples(motivationText: string, painPointText: string): string[] {
  const combined = s(`${motivationText} ${painPointText}`);
  const found: string[] = [];
  for (const [principle, keywords] of Object.entries(MOTIVATION_KEYWORDS)) {
    if (keywords.some(k => combined.includes(k))) {
      const real = PSYCHOLOGY_CHANNEL_AFFINITY.find(p => s(p["Psychology Principle"]) === principle);
      if (real) found.push(str(real["Psychology Principle"]));
    }
  }
  return [...new Set(found)];
}

// ── Main export ────────────────────────────────────────────────────────────────
export function analyzeMarketingReasoning(personaNames: string[]): MarketingReasoningSignal {
  const reasoningNotes: string[] = [];
  const messagingGuidance: string[] = [];
  const disfavoredOpportunityTypes: string[] = [];
  const favoredOpportunityTypes: string[] = [];
  const channelAdjustmentsMap = new Map<string, { total: number; count: number; reasons: string[] }>();

  let resolvedObjections = 0, unresolvedObjections = 0;
  let inferredPrinciples = 0;

  for (const personaName of personaNames) {
    const personaRow = PERSONAS.find(p => s(p["Persona Name"]) === s(personaName));
    const objections = getObjectionsForPersona(personaName);

    for (const objection of objections) {
      const barrier = classifyObjection(objection);
      if (barrier) {
        resolvedObjections++;
        const barrierName = str(barrier["Node Name"]);
        const solution = BUYING_SOLUTIONS.find(sol => s(sol["Barrier"]) === s(barrierName));
        if (solution) {
          messagingGuidance.push(
            `Persona "${personaName}" has objection "${objection}" (classified as ${barrierName}) — lead with ${solution["Best Solution"]}.`
          );
          reasoningNotes.push(`"${objection}" -> ${barrierName} barrier -> ${solution["Best Solution"]} (via buyingbarriers/buyingsolutions, keyword-classified)`);
        }
        // High-friction barriers (Complexity, Risk, Trust) disfavor loud, low-context channels
        if (["trust", "risk", "complexity"].includes(s(barrierName))) {
          disfavoredOpportunityTypes.push("High-volume low-context paid social");
          favoredOpportunityTypes.push("Content Marketing (educational, builds trust before asking)");
        }
      } else {
        unresolvedObjections++;
        reasoningNotes.push(`"${objection}" for persona "${personaName}" — no keyword match to a Buying Barrier category, left unclassified rather than forced.`);
      }
    }

    if (personaRow) {
      const principles = inferPsychologyPrinciples(str(personaRow["Buying Motivation"]), str(personaRow["Primary Pain Point"]));
      inferredPrinciples += principles.length;
      for (const principle of principles) {
        const affinityRows = PSYCHOLOGY_CHANNEL_AFFINITY.filter(a => s(a["Psychology Principle"]) === s(principle));
        for (const a of affinityRows) {
          const channel = str(a["Channel"]);
          const score = Number(a["Affinity Score"]) || 0;
          const entry = channelAdjustmentsMap.get(channel) ?? { total: 0, count: 0, reasons: [] };
          entry.total += score;
          entry.count += 1;
          entry.reasons.push(`${principle} (persona "${personaName}"): ${a["Reasoning"]}`);
          channelAdjustmentsMap.set(channel, entry);
        }
        reasoningNotes.push(`Persona "${personaName}" motivation/pain-point text suggests "${principle}" is relevant (keyword-inferred, not a verified relational link).`);
      }
    }
  }

  const channelAffinityAdjustments: ChannelAffinityAdjustment[] = [...channelAdjustmentsMap.entries()]
    .map(([channel, { total, count, reasons }]) => ({
      channel,
      // Average affinity score across all matched principles, scaled down to a
      // modest adjustment (max +/-15) — this is a nudge on top of Channel
      // Suitability's own scoring, never a replacement for it.
      adjustment: Math.round((total / count) * 0.15),
      reasoning: reasons.join(" | "),
    }))
    .sort((a, b) => b.adjustment - a.adjustment);

  // Confidence reflects how much of this signal came from verified data
  // (real graph objections) vs. keyword inference (motivation -> principle).
  const totalObjections = resolvedObjections + unresolvedObjections;
  let confidence: "High" | "Medium" | "Low" = "Low";
  if (totalObjections > 0 && resolvedObjections / totalObjections >= 0.6) confidence = "High";
  else if (totalObjections > 0 || inferredPrinciples > 0) confidence = "Medium";

  if (personaNames.length === 0) {
    reasoningNotes.push("No personas provided — signal is empty, not fabricated.");
  }

  return {
    favoredOpportunityTypes: [...new Set(favoredOpportunityTypes)],
    disfavoredOpportunityTypes: [...new Set(disfavoredOpportunityTypes)],
    channelAffinityAdjustments,
    messagingGuidance,
    reasoningNotes,
    confidence,
  };
}

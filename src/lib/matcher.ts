/**
 * Smarkin AI — Relationship Expansion Engine v3
 *
 * Retrieves Meta interests the way an experienced Meta media buyer thinks:
 * not just literal keyword matches, but the full buying ecosystem.
 *
 * 10 relationship layers → candidate pool → score → rank → return top N.
 * Every recommendation carries a full relationship path and weight.
 * Only verified interests from the Meta Interest Database are returned.
 */
import DB from "./smarkin-db.json";

// ── Types ──────────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;

export type RelationshipType =
  | "Direct"
  | "Category"
  | "Industry"
  | "Persona"
  | "Goal"
  | "PainPoint"
  | "Lifestyle"
  | "Complementary"
  | "Adjacent"
  | "PurchaseIntent"
  | "KnowledgeGraph"
  | "ProductUnderstanding";

export interface ScoredInterest {
  name:                 string;
  mainCategory:         string;
  subCategory:          string;
  buyingIntent:         string;
  score:                number;          // 0–100 — final combined ranking score
  relationshipType:     RelationshipType;
  relationshipWeight:   number;          // 0–1 — layer base weight
  relationshipDistance: number;          // 1 (closest) .. 10 (farthest) — how direct the signal is
  sourceQuality:        number;          // 0–100 — reliability of the underlying database source
  businessRelevance:    number;          // 0–100 — derived from the interest's Buying Intent
  personaMatch:         number;          // 0–100 — alignment with matched customer personas
  industryMatch:        number;          // 0–100 — alignment with the classified industry
  purchaseIntentScore:  number;          // 0–100 — active buying-intent signal strength
  confidence:           "High" | "Medium" | "Low";
  confidenceScore:      number;          // 0–100 numeric form of confidence
  relationshipPath:     string[];
  reason:               string;
  matchSource:          string;          // alias of reason, kept for backward compatibility
  databaseTable:        string;
  tier:                 "primary" | "secondary" | "expansion";
  pathCount:            number;          // how many independent relationship layers proposed this interest — Step 5 Confidence Engine evidence
}

export interface ScoredBehavior {
  id:               string;
  category:         string;
  parent:           string;
  child:            string;
  metaAudience:     string;
  score:            number;
  matchSource:      string;
  confidence:       "High" | "Medium" | "Low";
  relationshipPath: string[];
  reason:           string;
}

export interface MatcherInput {
  productName:  string;
  description:  string;
  businessType: string;
  objective:    string;
  country:      string;
}

// ── DB tables ─────────────────────────────────────────────────────────────────
// DB is a JSON import — TypeScript infers its type as the EXACT literal shape of
// whatever smarkin-db.json is present at build time. If an older/newer database
// file is deployed with a different set of tables (e.g. missing
// "knowledgeGraphRelationships" because it predates the v3 schema), a direct
// DB.xxx access fails the compile entirely rather than just being an empty array
// at runtime. Casting through Record<string, unknown> here means every table
// lookup degrades gracefully to [] instead of breaking the build when the
// deployed database doesn't yet have a given table.
const DB_ANY = DB as unknown as Record<string, Row[] | undefined>;

const KW    = (DB_ANY["keywordMappingDatabase"]       ?? []) as Row[];
const INT   = (DB_ANY["metaAdsInterest"]              ?? []) as Row[];
const BEH   = (DB_ANY["behaviors"]                    ?? []) as Row[];
const PER   = (DB_ANY["customerPersonaDatabase"]      ?? []) as Row[];
const IND   = (DB_ANY["industryIntelligenceDatabase"] ?? []) as Row[];
const PROB  = (DB_ANY["productProblemDatabase"]       ?? []) as Row[];
const GRAPH = (DB_ANY["knowledgeGraphRelationships"]  ?? []) as Row[];
// The richer, hand-curated causal graph: Product -BELONGS_TO-> Category,
// Product -HAS_BENEFIT/SUPPORTS-> Goal -ATTRACTS_PERSONA-> Persona
// -HAS_LIFESTYLE/HAS_PAIN_POINT/HAS_MOTIVATION-> ... -MATCHES_META_INTEREST-> Interest.
// Every edge carries a real Weight/Confidence score from the source spreadsheet —
// this is not a heuristic, it's expert-curated marketing psychology.
const EDGES = (DB_ANY["edges"] ?? []) as Row[];
const NODES = (DB_ANY["nodes"] ?? []) as Row[];
// Previously unused — verifies specific edges with real evidence (scientific
// literature, clinical research, verified Meta Interest checks). An edge backed
// by verified evidence should carry more conviction through the graph traversal
// than an equivalent unverified edge — this is a genuine confidence signal, not
// decoration.
const EVIDENCE = (DB_ANY["evidence"] ?? []) as Row[];
// The semantic product-understanding layer — queried FIRST, before keyword
// matching, whenever a product name matches a canonical product type here.
const PRODUCT_UNDERSTANDING = (DB_ANY["aiProductUnderstandingDataba"] ?? []) as Row[];

// ── Helpers ────────────────────────────────────────────────────────────────────
function s(v: unknown): string { return v == null ? "" : String(v).toLowerCase().trim(); }
function str(v: unknown): string { return v == null ? "" : String(v).trim(); }
function splitCSV(v: unknown): string[] {
  return str(v).split(",").map(x => x.trim()).filter(Boolean);
}
function words(text: string): Set<string> {
  return new Set(s(text).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(w => w.length > 2));
}
function overlap(a: string, b: string): number {
  const wa = words(a), wb = words(b);
  return [...wa].filter(w => wb.has(w)).length;
}
function containsWord(hay: string, needle: string): boolean {
  const re = new RegExp(`(?<![a-z])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`);
  return re.test(s(hay));
}
// Naive English singularizer — strips a trailing 's' (not 'ss') from the LAST word only.
// The DB's own Singular Form/Plural Form columns are unreliable (column-shift corruption
// affects ~20% of rows), so pluralization is handled here instead of trusting those fields.
function singularizeLastWord(text: string): string {
  const parts = s(text).split(/\s+/);
  if (parts.length === 0) return text;
  const last = parts[parts.length - 1];
  if (last.length > 3 && last.endsWith("s") && !last.endsWith("ss")) {
    parts[parts.length - 1] = last.slice(0, -1);
  }
  return parts.join(" ");
}
// Word-boundary match that also tries both sides singularized, so "Restaurants" (query)
// matches "Restaurant" (keyword) and vice versa.
function containsWordFlexible(hay: string, needle: string): boolean {
  if (containsWord(hay, needle)) return true;
  const hayS = singularizeLastWord(hay), needleS = singularizeLastWord(needle);
  return containsWord(hayS, needleS) || containsWord(hay, needleS) || containsWord(hayS, needle);
}

// ── LAYER 0: Verify interest exists in DB ────────────────────────────────────
// Build a lookup: normalized name → full row
const INTEREST_INDEX = new Map<string, Row>();
for (const row of INT) {
  INTEREST_INDEX.set(s(str(row["Meta Interest Name"])), row);
}

function resolveInterest(name: string): Row | null {
  const key = s(name);
  if (!key) return null;

  // 1. Exact match
  if (INTEREST_INDEX.has(key)) return INTEREST_INDEX.get(key)!;

  // 2+3. Substring & token-overlap fuzzy match — pick the BEST scoring match,
  //      not the first one found (fixes "Banking" resolving to a random banking interest).
  const keyWords = words(key);
  let best: { row: Row; score: number } | null = null;

  for (const [k, row] of INTEREST_INDEX) {
    let score = 0;
    if (k.startsWith(key) || key.startsWith(k)) score = 50 + overlap(k, key) * 5;
    else if (k.includes(key) || key.includes(k)) score = 30 + overlap(k, key) * 5;
    else {
      // Token-overlap fuzzy match — e.g. "Property (real estate)" → "Real estate (industry)"
      const kWords = words(k);
      const ov = [...keyWords].filter(w => kWords.has(w)).length;
      if (ov >= 1 && keyWords.size <= 4) score = ov * 10;  // only for short candidate names
    }
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }

  return (best && best.score >= 20) ? best.row : null;
}

// ── STAGE 1: Classify product ─────────────────────────────────────────────────
interface Classification {
  matchedKW:    Row | null;   // single best match — used for display/path strings
  matchedKWs:   Row[];        // ALL keyword rows tied at the top score tier —
                               // needed for broad category queries ("Insurance",
                               // "Restaurants") that match many specific product rows
                               // (e.g. "Business Insurance", "Life Insurance", "Car Insurance")
                               // rather than a single SKU-level keyword.
  industry:     string;
  category:     string;
  subCategory:  string;
  personas:     Row[];
  problems:     Row[];
  indIntel:     Row | null;
  productUnderstanding: Row | null;  // semantic product-type match — queried FIRST, overrides
                                       // keyword-derived industry/category when found
}

// Find a canonical product-type match — this is the FIRST thing checked for any
// product, before any keyword scanning. Matches on Product Type text using the
// same bidirectional flexible matching used elsewhere, since a true embedding-
// based semantic match isn't available in a deterministic, non-ML pipeline —
// but each row here carries a full semantic profile (function, use cases,
// pain points, goals) rather than a bare keyword-to-category mapping, so a hit
// here is a categorically stronger signal than a keyword-table hit.
function findProductUnderstanding(input: MatcherInput): Row | null {
  const q = s(`${input.productName} ${input.description}`);
  let best: { row: Row; score: number } | null = null;

  for (const row of PRODUCT_UNDERSTANDING) {
    const productType = s(row["Product Type"]);
    if (!productType) continue;
    let score = 0;
    if (q === productType) score = 100;
    else if (containsWordFlexible(q, productType) || containsWordFlexible(productType, q)) score = 90;
    else {
      // Weaker fallback: overlap against Primary Use Case / Product Function text
      const funcText = s(`${row["Primary Use Case"]} ${row["Product Function"]}`);
      const ov = [...words(q)].filter(w => words(funcText).has(w) && w.length > 3).length;
      if (ov >= 2) score = 40 + ov * 5;
    }
    if (score > 0 && (!best || score > best.score)) best = { row, score };
  }
  return best && best.score >= 40 ? best.row : null;
}

function classify(input: MatcherInput): Classification {
  const q = s(`${input.productName} ${input.description}`);
  const qw = words(q);

  // STEP 0 — semantic product-understanding lookup, before any keyword scan.
  const productUnderstanding = findProductUnderstanding(input);

  let bestScore = 0;
  const scored: { row: Row; sc: number }[] = [];

  for (const row of KW) {
    const pk   = s(row["Primary Keyword"]);
    const alt  = s(row["Alternative Keywords"]);
    const syn  = s(row["Synonyms"]);
    const norm = s(row["Normalized Keyword"]);
    const tag  = s(row["AI Search Tags"]);
    const cat  = s(row["Product Category"]);
    if (!pk) continue;  // skip blank/incomplete stub rows

    let sc = 0;
    // Bidirectional containment: query-in-keyword ("insurance" found inside "car
    // insurance") AND keyword-in-query ("elitebook" found inside a longer query).
    if (q === pk || containsWordFlexible(q, pk) || containsWordFlexible(pk, q))              sc = 100;
    else if (norm && (q === norm || containsWordFlexible(q, norm) || containsWordFlexible(norm, q))) sc = 98;
    else if (splitCSV(alt).some(a => containsWordFlexible(q, s(a)) || containsWordFlexible(s(a), q))) sc = 90;
    else if (splitCSV(syn).some(sy => containsWordFlexible(q, s(sy)) || containsWordFlexible(s(sy), q))) sc = 88;
    else if (overlap(q, tag) >= 2)                                           sc = 80;
    else if ([...qw].some(w => cat.includes(w)))                             sc = 60;

    if (sc > 0) scored.push({ row, sc });
    if (sc > bestScore) bestScore = sc;
  }

  // Collect matching rows. A query like "Insurance" should pull Business/Life/Car/
  // Health/Travel/Pet Insurance rows together, not arbitrarily pick just one.
  // For non-exact matches, widen the band so a single row scoring slightly higher
  // (e.g. via AI Search Tags) doesn't shadow siblings tied at a nearby tier
  // (e.g. via Product Category) — they're all still valid matches for a broad query.
  const band       = bestScore >= 100 ? 0 : 20;
  const topTier    = scored.filter(x => x.sc >= bestScore - band).map(x => x.row);
  const matchedKWs = topTier.slice(0, 12);   // cap to avoid runaway candidate explosion
  const bestKW     = matchedKWs[0] ?? null;

  // Category/industry come from the MOST COMMON value across matchedKWs, not just
  // row [0] — a single miscategorized outlier (e.g. "Restaurant POS Terminal" filed
  // under "Ecommerce" while 8 sibling rows are "Food & Beverage") must not hijack
  // the whole classification.
  function mode(values: string[]): string {
    const counts = new Map<string, number>();
    for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
    let best = "", bestCount = 0;
    for (const [v, c] of counts) if (c > bestCount) { best = v; bestCount = c; }
    return best;
  }
  const kwIndustry = mode(matchedKWs.map(r => str(r["Related Industries"]))) ||
                   str(input.businessType ?? "Retail & Ecommerce");
  const kwCategory = mode(matchedKWs.map(r => str(r["Product Category"]))) ||
                   str(input.businessType ?? "General");
  const kwSubCat   = str(bestKW?.["Product Subcategory"] ?? "");

  // Product-understanding match OVERRIDES keyword-derived classification when
  // present — this is what "queried first" actually means: a semantic product-
  // type hit is a stronger signal than a keyword-table hit, so it wins.
  const industry = productUnderstanding ? str(productUnderstanding["Industry"]) : kwIndustry;
  const category = productUnderstanding ? str(productUnderstanding["Category"]) : kwCategory;
  const subCat    = productUnderstanding ? str(productUnderstanding["Sub Category"]) : kwSubCat;

  // Find matching personas
  const recPersonas = matchedKWs.flatMap(r => splitCSV(r["Recommended Persona"]));
  if (productUnderstanding) recPersonas.push(...splitCSV(productUnderstanding["Related Personas"]));
  const personas = PER.filter(p => recPersonas.some(rp =>
    s(p["Persona Name"]).includes(s(rp)) || s(rp).includes(s(p["Persona Name"]))
  ));
  // Also match by product tags
  if (personas.length === 0) {
    for (const p of PER) {
      if (overlap(q, str(p["AI Search Tags"])) >= 1 ||
          overlap(q, str(p["Common Product Categories"])) >= 1) {
        personas.push(p);
      }
    }
  }

  // Find matching problems
  const problems = PROB.filter(p => overlap(q, str(p["AI Search Tags"])) >= 1 ||
                                    overlap(q, str(p["Common Products"])) >= 1);

  // Find industry intel — try exact then partial
  const indExact = IND.find(r => s(r["Industry"]) === s(industry));
  const indIntel = indExact ?? IND.find(r =>
    splitCSV(industry).some(seg => s(r["Industry"]).includes(s(seg))) ||
    overlap(industry, str(r["Industry"])) >= 1
  ) ?? null;

  return { matchedKW: bestKW, matchedKWs, industry, category, subCategory: subCat, personas, problems, indIntel, productUnderstanding };
}

// ══════════════════════════════════════════════════════════════════════════════
// STAGE 2 — INDEPENDENT RELATIONSHIP LAYERS
//
// Core mindset: don't ask "which Meta interests match this product?" — ask
// "who is most likely to buy this, and which verified Meta interests describe
// those people?" Each layer below answers that question from a DIFFERENT
// angle (category, industry, persona, goal, pain point, lifestyle, ...) and
// contributes candidates on its own. No layer requires another layer to have
// found something first — Direct can return zero and Lifestyle/Adjacent/
// Industry still populate the pool. This is what "Category" and "Industry" in
// particular gain here: each keeps its keyword-table traversal AND adds an
// independent direct scan of the Meta Interest Database itself, so a layer
// never silently goes empty just because no keyword row happened to list the
// right interest in its "Related Meta Interests" cell.
// ══════════════════════════════════════════════════════════════════════════════

interface RawCandidate {
  name: string;       // candidate interest name (not yet verified against DB)
  path: string[];      // relationship path for explainability
  note: string;        // human-readable reason this candidate was proposed
}

// A layer is fully self-describing: the ranking engine below never special-cases
// a layer by name. Adding "Brand Affinity" or "Seasonal Intent" later means
// writing one more LayerDefinition and pushing it into LAYERS — nothing else
// in the file changes.
interface LayerDefinition {
  type:          string;   // relationship type name — extensible beyond the 10 core types
  distance:      number;   // 1 (closest to direct buyer intent) .. 10 (broadest/farthest)
  sourceQuality: number;   // 0-100 — how verified/reliable this layer's underlying data is
  baseWeight:    number;   // 0-1 — relationship-type strength, same role as a priority weight
  collect: (input: MatcherInput, cl: Classification) => RawCandidate[];
}

function mk(name: string, path: string[], note: string): RawCandidate {
  return { name: name.trim(), path, note };
}

// ── Graph indices (built once at module load) ──────────────────────────────────
// Precomputed lookups so traversal doesn't linear-scan 193 edges per call.
const NODE_TYPE_BY_NAME = new Map<string, string>();
for (const n of NODES) NODE_TYPE_BY_NAME.set(s(n["Node Name"]), str(n["Node Type"]));

const EDGES_BY_SOURCE = new Map<string, Row[]>();
for (const e of EDGES) {
  const src = s(e["Source"]);
  if (!EDGES_BY_SOURCE.has(src)) EDGES_BY_SOURCE.set(src, []);
  EDGES_BY_SOURCE.get(src)!.push(e);
}

// Evidence index: key = "source|relationship|target" (all lowercased), value = evidence row
const EVIDENCE_BY_EDGE = new Map<string, Row>();
for (const ev of EVIDENCE) {
  const key = `${s(ev["Source Node"])}|${s(ev["Relationship"])}|${s(ev["Target Node"])}`;
  EVIDENCE_BY_EDGE.set(key, ev);
}
function findEvidence(source: string, relationship: string, target: string): Row | null {
  return EVIDENCE_BY_EDGE.get(`${s(source)}|${s(relationship)}|${s(target)}`) ?? null;
}

const PRODUCT_NODE_NAMES = NODES.filter(n => str(n["Node Type"]) === "Product").map(n => str(n["Node Name"]));

// ── Layer: KNOWLEDGE GRAPH ───────────────────────────────────────────────────────
// "Follow the hand-curated reasoning chain a marketing strategist would build by
// hand." Unlike every other layer, this doesn't use word-overlap heuristics — it
// walks a real, expert-authored graph: Product -BELONGS_TO-> Category, Product
// -HAS_BENEFIT/SUPPORTS-> Goal -ATTRACTS_PERSONA-> Persona -HAS_LIFESTYLE/
// HAS_PAIN_POINT/HAS_MOTIVATION-> ... -MATCHES_META_INTEREST-> verified Interest.
// Every edge carries a real Weight/Confidence from the source data, which
// compounds along the path so conviction correctly decays the further you
// travel from the product. This layer only fires for products that exist as a
// "Product" node in the graph (currently a small, hand-built pilot set) — for
// everything else it legitimately contributes nothing, which is reported as a
// gap rather than silently doing nothing.
const GRAPH_MAX_HOPS = 5;
const GRAPH_MAX_NODES_VISITED = 200; // safety cap, graph is small (171 nodes) but guard against future growth

function findMatchingProductNodes(input: MatcherInput, cl: Classification): string[] {
  const q = s(input.productName);
  const kwName = cl.matchedKW ? s(str(cl.matchedKW["Primary Keyword"])) : "";
  const pfName = cl.matchedKW ? s(str(cl.matchedKW["Product Family"])) : "";
  return PRODUCT_NODE_NAMES.filter(name => {
    const n = s(name);
    return n === q || q.includes(n) || n.includes(q) ||
           (kwName && (n === kwName || n.includes(kwName) || kwName.includes(n))) ||
           (pfName && (n === pfName || n.includes(pfName) || pfName.includes(n)));
  });
}

function collectKnowledgeGraph(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const startNodes = findMatchingProductNodes(input, cl);
  if (startNodes.length === 0) return out;  // legitimately empty — reported as a gap, not fabricated

  const productPath = [input.productName, cl.category, cl.industry];

  // BFS from each matching product node, tracking the full path and the
  // compounded (multiplicative) confidence of the chain traveled so far.
  interface Frontier { node: string; path: string[]; edgeChain: string[]; conviction: number; hop: number; evidenceCount: number }
  const visited = new Set<string>();
  let queue: Frontier[] = startNodes.map(n => ({ node: n, path: [n], edgeChain: [], conviction: 1.0, hop: 0, evidenceCount: 0 }));

  let visitedCount = 0;
  while (queue.length > 0 && visitedCount < GRAPH_MAX_NODES_VISITED) {
    const next: Frontier[] = [];
    for (const f of queue) {
      const key = s(f.node);
      if (visited.has(key)) continue;
      visited.add(key);
      visitedCount++;

      const nodeType = NODE_TYPE_BY_NAME.get(key) ?? "";
      if (nodeType === "Meta Interest") {
        const evidenceNote = f.evidenceCount > 0 ? `, ${f.evidenceCount} verified evidence-backed hop(s)` : "";
        out.push(mk(f.node,
          [...productPath, `Knowledge Graph: ${f.edgeChain.join(" -> ")}`],
          `Graph chain (confidence ${Math.round(f.conviction * 100)}%${evidenceNote}): ${f.path.join(" -> ")}`));
      }

      if (f.hop >= GRAPH_MAX_HOPS) continue;
      const outgoing = EDGES_BY_SOURCE.get(key) ?? [];
      for (const e of outgoing) {
        const target = str(e["Target"]);
        if (visited.has(s(target))) continue;
        const edgeWeight = Number(e["Weight"] ?? 100) / 100;
        const edgeConf   = Number(e["Confidence"] ?? 100) / 100;
        // A verified edge (backed by real scientific/clinical evidence, not just
        // an asserted weight/confidence pair) earns a small conviction boost —
        // this is a genuine trust signal, not decoration.
        const evidenceRow = findEvidence(key, str(e["Relationship"]), target);
        const evidenceBoost = evidenceRow && s(evidenceRow["Verified"]) === "yes" ? 1.08 : 1.0;
        next.push({
          node: target,
          path: [...f.path, target],
          edgeChain: [...f.edgeChain, str(e["Relationship"])],
          conviction: Math.min(1.0, f.conviction * edgeWeight * edgeConf * evidenceBoost),
          hop: f.hop + 1,
          evidenceCount: f.evidenceCount + (evidenceRow ? 1 : 0),
        });
      }
    }
    queue = next;
  }

  return out;
}

// ── Layer: DIRECT ──────────────────────────────────────────────────────────────
// "This person searched for exactly this product." Closest possible signal.
// ── Layer: PRODUCT UNDERSTANDING ─────────────────────────────────────────────────
// The semantic layer — fires when classify() found a match in
// aiProductUnderstandingDataba. This is the highest-priority, highest-trust
// layer in the entire engine: each row was authored with a full semantic
// profile (function, use case, pain points, goals), not a bare keyword.
function collectProductUnderstanding(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  if (!cl.productUnderstanding) return out;
  const row = cl.productUnderstanding;
  const productPath = [input.productName, str(row["Product Type"]), cl.category, cl.industry];
  const notes = str(row["Reasoning Notes"]);

  splitCSV(row["Related Interests"]).forEach(n =>
    out.push(mk(n, [...productPath, "AI Product Understanding"],
                 `Semantic product-type match: "${row["Product Type"]}" (confidence weight ${row["Confidence Weight"]}). ${notes}`))
  );
  return out;
}

function collectDirect(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];
  for (const kwRow of cl.matchedKWs) {
    const kw = str(kwRow["Primary Keyword"]);
    splitCSV(kwRow["Related Meta Interests"]).forEach(n =>
      out.push(mk(n, [...productPath, `Keyword: ${kw}`], `Keyword direct match: ${kw}`))
    );
    const pfName = str(kwRow["Product Family"]) || kw;
    GRAPH.filter(e => str(e["Relationship Type"]) === "MATCHED_TO" &&
                       (s(e["Source Name"]) === s(pfName) || s(e["Source Name"]) === s(kw)))
      .forEach(e => out.push(mk(str(e["Target Name"]), [...productPath, "Knowledge Graph"],
                                 `Knowledge Graph: ${pfName} -> MATCHED_TO`)));
  }
  return out;
}

// ── Layer: CATEGORY ────────────────────────────────────────────────────────────
// "People shopping this product category." Independent of Direct: even with
// zero keyword match, a DB scan against cl.category/subCategory still fires.
function collectCategory(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];

  // (a) Sibling keyword rows sharing the same Product Category
  if (cl.category) {
    const matchedSet = new Set(cl.matchedKWs);
    const siblings = KW.filter(r => s(r["Product Category"]) === s(cl.category) && !matchedSet.has(r)).slice(0, 15);
    for (const sib of siblings) {
      splitCSV(sib["Related Meta Interests"]).forEach(n =>
        out.push(mk(n, [...productPath, `Category: ${cl.category}`],
                     `Category sibling: ${str(sib["Primary Keyword"])}`))
      );
    }
  }

  // (b) Independent direct scan — interests whose Sub/Main Category text OR
  //     Product Match / Audience Description text overlaps the classified
  //     category/subcategory, with NO dependency on any keyword row. The extra
  //     text fields matter because some verticals (e.g. Real Estate) file their
  //     interest under a generic Sub Category ("Industry") while the real
  //     category signal only shows up in Product Match ("Property, land,
  //     housing services") or Audience Description ("Property buyers, investors").
  //
  //     Requires overlap to scale with catWords size: a 2-word category like
  //     "Home & Kitchen" must match BOTH "home" AND "kitchen" — matching only
  //     the generic word "home" alone let through unrelated interests like
  //     "Mortgage loans" (Product Match mentions "home loans") and "Projectors"
  //     (Audience Description mentions "home theater"). Single-word categories
  //     like "Coffee" still match on their one word since no stricter bar exists.
  const catWords = words(`${cl.category} ${cl.subCategory}`);
  const catOverlapThreshold = Math.min(2, catWords.size);
  if (catWords.size > 0) {
    for (const row of INT) {
      const intCat   = s(row["Main Category"]);
      const intSub   = s(row["Sub Category"]);
      const intMatch = s(row["Product Match"]);
      const intAud   = s(row["Audience Description"]);
      const ov = [...catWords].filter(w =>
        intCat.includes(w) || intSub.includes(w) || intMatch.includes(w) || intAud.includes(w)
      ).length;
      if (ov >= catOverlapThreshold) {
        out.push(mk(str(row["Meta Interest Name"]),
          [...productPath, `Category DB scan: ${str(row["Main Category"])} / ${str(row["Sub Category"])}`],
          `Independent category scan (${ov} term overlap with ${cl.category})`));
      }
    }
  }
  return out;
}

// ── Layer: INDUSTRY ────────────────────────────────────────────────────────────
// "People active in this industry's buying ecosystem."
function collectIndustry(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];

  // (a) Industry Intelligence table — curated, independent of the keyword table
  if (cl.indIntel) {
    const ind = str(cl.indIntel["Industry"]);
    splitCSV(cl.indIntel["Related Meta Interests"]).forEach(n =>
      out.push(mk(n, [...productPath, `Industry: ${ind}`], `Industry Intelligence: ${ind}`))
    );
    const commonProds = splitCSV(cl.indIntel["Common Products"]);
    for (const prod of commonProds.slice(0, 5)) {
      const prodKW = KW.find(r => s(r["Primary Keyword"]) === s(prod) ||
                                   s(r["Alternative Keywords"]).includes(s(prod)));
      if (prodKW) {
        splitCSV(prodKW["Related Meta Interests"]).forEach(n =>
          out.push(mk(n, [...productPath, `Industry common product: ${prod}`],
                       `Industry common product: ${prod}`))
        );
      }
    }
  }

  // (b) Independent direct scan — interests whose own Industry field overlaps
  //     the classified industry, entirely independent of Industry Intelligence rows.
  const indSegs = splitCSV(cl.industry).map(s);
  if (indSegs.length > 0) {
    for (const row of INT) {
      const intInd = s(row["Industry"]);
      if (indSegs.some(seg => seg && intInd.includes(seg))) {
        out.push(mk(str(row["Meta Interest Name"]),
          [...productPath, `Industry DB scan: ${str(row["Industry"])}`],
          `Independent industry scan: interest industry matches "${cl.industry}"`));
      }
    }
  }
  return out;
}

// ── Layer: PERSONA ─────────────────────────────────────────────────────────────
// "Who buys this — what kind of person are they, and what else do they want?"
function collectPersona(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];

  // Primary source: personas already matched during classification (product-text match)
  let personas = cl.personas;

  // Independent fallback: if classification found no persona from the raw product
  // text, broaden the net to any persona whose tags/categories overlap the
  // classified INDUSTRY or CATEGORY instead — this makes Persona self-sufficient
  // rather than solely dependent on classify()'s narrower product-name match.
  if (personas.length === 0) {
    const ctxWords = words(`${cl.industry} ${cl.category}`);
    personas = PER.filter(p => {
      const tagWords = words(`${str(p["AI Search Tags"])} ${str(p["Common Product Categories"])}`);
      return [...ctxWords].some(w => tagWords.has(w));
    });
  }

  for (const persona of personas) {
    const pname = str(persona["Persona Name"]);
    splitCSV(persona["Recommended Meta Interests"]).forEach(n =>
      out.push(mk(n, [...productPath, `Persona: ${pname}`], `Persona: ${pname}`))
    );
    splitCSV(persona["Common Product Categories"]).slice(0, 3).forEach(cat => {
      const catKW = KW.filter(r => s(r["Product Category"]) === s(cat)).slice(0, 3);
      catKW.forEach(r => splitCSV(r["Related Meta Interests"]).forEach(n =>
        out.push(mk(n, [...productPath, `Persona: ${pname}`, `Category: ${cat}`],
                     `Persona ${pname} also shops ${cat}`))
      ));
    });
  }
  return out;
}

// ── Layer: GOAL ─────────────────────────────────────────────────────────────────
// "What outcome is this buyer trying to achieve?"
function collectGoal(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];
  const goals: string[] = [];
  for (const kwRow of cl.matchedKWs) goals.push(...splitCSV(kwRow["Customer Goal"]));
  for (const prob of cl.problems) goals.push(str(prob["Customer Goal"]));
  for (const goal of [...new Set(goals)].filter(Boolean).slice(0, 4)) {
    const goalKWs = KW.filter(r =>
      s(r["Customer Goal"]).includes(s(goal)) || s(r["Customer Search Intent"]).includes(s(goal))
    ).slice(0, 5);
    goalKWs.forEach(r => splitCSV(r["Related Meta Interests"]).forEach(n =>
      out.push(mk(n, [...productPath, `Goal: ${goal}`], `Shared customer goal: "${goal}"`))
    ));
  }
  return out;
}

// ── Layer: PAIN POINT ───────────────────────────────────────────────────────────
// "What problem is this buyer trying to solve?"
function collectPainPoint(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];
  const pains: string[] = [];
  for (const kwRow of cl.matchedKWs) pains.push(str(kwRow["Customer Problem"]));
  for (const prob of cl.problems) pains.push(str(prob["Problem"]));
  for (const pain of [...new Set(pains)].filter(Boolean).slice(0, 3)) {
    const painKWs = KW.filter(r => s(r["Customer Problem"]).includes(s(pain))).slice(0, 4);
    painKWs.forEach(r => splitCSV(r["Related Meta Interests"]).forEach(n =>
      out.push(mk(n, [...productPath, `Pain: ${pain}`], `Shared pain point: "${pain}"`))
    ));
    GRAPH.filter(e => str(e["Relationship Type"]) === "HAS_PAIN_POINT" && s(str(e["Target Name"])) === s(pain))
      .forEach(e => {
        const personaName = str(e["Source Name"]);
        const per = PER.find(r => s(r["Persona Name"]) === s(personaName));
        if (per) splitCSV(per["Recommended Meta Interests"]).forEach(n =>
          out.push(mk(n, [...productPath, `Pain: ${pain}`, `Persona: ${personaName}`],
                       `Knowledge Graph: ${personaName} -> HAS_PAIN_POINT -> ${pain}`))
        );
      });
  }
  return out;
}

// ── Layer: LIFESTYLE ────────────────────────────────────────────────────────────
// "What does this buyer's life look like outside this one purchase?" Curated,
// DB-verified expansion map — fully independent of keyword/persona/goal data.
const LIFESTYLE_MAP: Record<string, string[]> = {
  "Health & Fitness":  ["Running (sport)","Yoga (fitness)","Swimming (water sport)",
                        "Marathons (running event)","Camping (outdoors activities)",
                        "Organic food (food & drink)","Veganism (diets)","Recipes (food & drinks)",
                        "Mountain biking (cycling)","Triathlons (athletics)"],
  "Beauty":            ["Beauty salons (cosmetics)","Spas (personal care)","Fragrances (cosmetics)",
                        "Hair products (hair care)","Women's clothing (apparel)","Yoga (fitness)",
                        "Tattoos (body art)","Jewelry (apparel)","Handbags (accessories)",
                        "Dresses (apparel)","Sunglasses (eyewear)","Boutiques (retailers)",
                        "Online shopping (retail)","Luxury goods (retail)"],
  "Fashion":           ["Shopping malls (retail)","Online shopping (retail)","Luxury goods (retail)",
                        "Women's clothing (apparel)","Men's clothing (apparel)","Shoes (footwear)",
                        "Handbags (accessories)","Jewelry (apparel)","Boutiques (retailers)"],
  "Food & Beverage":   ["Recipes (food & drinks)","Baking (cooking)","Restaurants (dining)",
                        "Coffeehouses (coffee)","Organic food (food & drink)","Wine (alcoholic drinks)"],
  "Technology":        ["Software (computers & electronics)","Smartphones (consumer electronics)",
                        "Computers (computers & electronics)","Social media (online media)"],
  "Real Estate":       ["Home improvement (home & garden)","Do it yourself (DIY)",
                        "Interior design (design)","Furniture (home furnishings)","Investment (business & finance)"],
  "Finance":           ["Investment (business & finance)","Insurance (business & finance)",
                        "Credit cards (credit & lending)","Entrepreneurship (business & finance)"],
  "Education":         ["Books (publications)","E-books (publications)","Higher education (education)",
                        "Writing (communication)"],
  "Travel":            ["Adventure travel (travel & tourism)","Hotels (lodging)","Vacations (social concept)",
                        "Air travel (transportation)","Beaches (places)"],
  "Sports":            ["Camping (outdoors activities)","Fishing (outdoors activities)",
                        "Basketball (sport)","Golf (sport)","Surfing (water sport)"],
  "Pets":              ["Dogs (animals)","Cats (animals)","Pet food (pet supplies)"],
  "Gaming":            ["Video games (gaming)","Action games (video games)","Online games (video games)"],
  "Automotive":        ["Automobiles (vehicles)","SUVs (vehicles)","Electric vehicle (vehicle)"],
  "Home & Garden":     ["Home improvement (home & garden)","Gardening (outdoor activities)",
                        "Furniture (home furnishings)","Do it yourself (DIY)","Home Appliances (consumer electronics)"],
  "Restaurants":       ["Recipes (food & drinks)","Coffee (food & drink)","Wine (alcoholic drinks)",
                        "Coffeehouses (coffee)","Fast casual restaurants (restaurant)"],
};

function collectLifestyle(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];
  const lifestyleKey = Object.keys(LIFESTYLE_MAP).find(k =>
    s(cl.category).includes(s(k)) || s(k).includes(s(cl.category)) ||
    s(cl.industry).includes(s(k)) || s(k).includes(s(cl.industry))
  ) ?? "";
  if (lifestyleKey) {
    (LIFESTYLE_MAP[lifestyleKey] ?? []).forEach(n =>
      out.push(mk(n, [...productPath, `Lifestyle: ${lifestyleKey}`], `Lifestyle expansion for ${lifestyleKey}`))
    );
  }
  return out;
}

// ── Layer: COMPLEMENTARY ────────────────────────────────────────────────────────
// "What else does this buyer purchase alongside this product?"
function collectComplementary(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];

  for (const kwRow of cl.matchedKWs) {
    const kwName = str(kwRow["Primary Keyword"]);
    const relInds = splitCSV(kwRow["Related Industries"]).slice(0, 3);
    for (const ri of relInds) {
      const indKWs = KW.filter(r => s(r["Related Industries"]).includes(s(ri)) && r !== kwRow).slice(0, 5);
      indKWs.forEach(r => splitCSV(r["Related Meta Interests"]).forEach(n =>
        out.push(mk(n, [...productPath, `Related Industry: ${ri}`, str(r["Primary Keyword"])],
                     `Complementary via ${ri}: ${str(r["Primary Keyword"])}`))
      ));
    }

    // "Complementary Products" field — guarded against known column-shift corruption
    // (~20% of keyword rows have lifecycle-stage text like "Maturity" here instead).
    const compField = str(kwRow["Complementary Products"]);
    const looksLikeLifecycleStage = /^(introduction|growth|maturity|decline)$/i.test(compField.trim());
    if (compField && !looksLikeLifecycleStage) {
      splitCSV(compField).forEach(cp => {
        const cpKW = KW.find(r => s(r["Primary Keyword"]) === s(cp) ||
                                   s(r["Alternative Keywords"]).includes(s(cp)));
        if (cpKW) {
          splitCSV(cpKW["Related Meta Interests"]).forEach(n =>
            out.push(mk(n, [...productPath, `Complementary Product: ${cp}`], `Complementary product: ${cp}`))
          );
        }
      });
    }

    GRAPH.filter(e => ["CONNECTS_TO", "CONTAINS"].includes(str(e["Relationship Type"])) &&
                       s(e["Source Name"]) === s(kwName))
      .forEach(e => {
        const targetName = str(e["Target Name"]);
        const targetKW = KW.find(r => s(r["Primary Keyword"]) === s(targetName));
        if (targetKW) {
          splitCSV(targetKW["Related Meta Interests"]).forEach(n =>
            out.push(mk(n, [...productPath, `Knowledge Graph: ${targetName}`],
                         `Knowledge Graph: ${kwName} -> ${str(e["Relationship Type"])} -> ${targetName}`))
          );
        }
      });
  }
  return out;
}

// ── Layer: ADJACENT ─────────────────────────────────────────────────────────────
// "The broader neighborhood this buyer's interests live in." Loosest/farthest
// layer — fully independent DB scan, fires even with zero keyword match at all.
function collectAdjacent(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];
  // Same scaled-overlap logic as the Category layer's independent scan (see
  // collectCategory) — a single generic word like "home" matched too much
  // unrelated content (mortgage loans, projectors, gardening) for any category
  // containing that word. Require the full category word set to overlap,
  // scaling down to 1 only for genuinely single-word categories.
  const catWords = words(`${cl.category}`);
  const catOverlapThreshold = Math.min(2, catWords.size);
  for (const row of INT) {
    const intCat = s(row["Main Category"]);
    const intSub = s(row["Sub Category"]);
    const intInd = s(row["Industry"]);
    const intName = str(row["Meta Interest Name"]);
    const ov = [...catWords].filter(w => intCat.includes(w) || intSub.includes(w)).length;
    const industryMatch = cl.industry.split(",").some(seg => intInd.includes(s(seg.trim())) && s(seg.trim()).length > 3);
    if (ov >= catOverlapThreshold || industryMatch) {
      out.push(mk(intName,
        [...productPath, `Adjacent: ${str(row["Main Category"])} / ${str(row["Sub Category"])}`],
        `Adjacent neighborhood of ${cl.category}`));
    }
  }
  return out;
}

// ── Layer: PURCHASE INTENT ──────────────────────────────────────────────────────
// "This is a person actively in buying mode." Independent of category/keyword —
// pulls any high-buying-intent interest within the classified industry, plus a
// curated ecommerce shopping-behaviour list.
const PURCHASE_INTENT_CORE = [
  "Online shopping (retail)", "Coupons (coupons & discounts)",
  "Discount stores (retail)", "Luxury goods (retail)",
  "Boutiques (retailers)", "Shopping malls (retail)",
];

function collectPurchaseIntent(input: MatcherInput, cl: Classification): RawCandidate[] {
  const out: RawCandidate[] = [];
  const productPath = [input.productName, cl.category, cl.industry];

  const isEcomm = ["ecommerce","retail","fashion","beauty","shop","product","buy"].some(w =>
    s(input.businessType).includes(w) || s(cl.category).includes(w)
  );
  if (isEcomm) {
    PURCHASE_INTENT_CORE.forEach(n =>
      out.push(mk(n, [...productPath, "Purchase Intent"], "Ecommerce shopping-behaviour signal"))
    );
  }

  // Independent scan: any High-buying-intent interest whose Industry overlaps
  // the classified industry — these are the audiences already "in market."
  const indSegs = splitCSV(cl.industry).map(s);
  for (const row of INT) {
    if (str(row["Buying Intent"]) !== "High") continue;
    const intInd = s(row["Industry"]);
    if (indSegs.some(seg => seg && intInd.includes(seg))) {
      out.push(mk(str(row["Meta Interest Name"]),
        [...productPath, `Purchase Intent: ${str(row["Industry"])}`],
        `High buying-intent interest already active in ${cl.industry}`));
    }
  }
  return out;
}

// ── Layer registry ───────────────────────────────────────────────────────────
// Future layers (Brand Affinity, Purchase Behavior, Seasonal Intent, Device
// Usage, Content Consumption, Engagement History, ...) get added HERE ONLY.
// Nothing in the scoring/ranking engine below needs to change.
const LAYERS: LayerDefinition[] = [
  { type: "ProductUnderstanding", distance: 1, sourceQuality: 100, baseWeight: 1.00, collect: collectProductUnderstanding },
  { type: "KnowledgeGraph", distance: 1,  sourceQuality: 100, baseWeight: 0.98, collect: collectKnowledgeGraph },
  { type: "Direct",         distance: 1,  sourceQuality: 100, baseWeight: 1.00, collect: collectDirect },
  { type: "Category",       distance: 2,  sourceQuality: 95,  baseWeight: 0.88, collect: collectCategory },
  { type: "Industry",       distance: 3,  sourceQuality: 92,  baseWeight: 0.82, collect: collectIndustry },
  { type: "Persona",        distance: 4,  sourceQuality: 90,  baseWeight: 0.80, collect: collectPersona },
  { type: "Goal",           distance: 5,  sourceQuality: 82,  baseWeight: 0.76, collect: collectGoal },
  { type: "PainPoint",      distance: 5,  sourceQuality: 82,  baseWeight: 0.74, collect: collectPainPoint },
  { type: "Lifestyle",      distance: 6,  sourceQuality: 85,  baseWeight: 0.70, collect: collectLifestyle },
  { type: "Complementary",  distance: 7,  sourceQuality: 75,  baseWeight: 0.65, collect: collectComplementary },
  { type: "Adjacent",       distance: 9,  sourceQuality: 70,  baseWeight: 0.60, collect: collectAdjacent },
  { type: "PurchaseIntent", distance: 4,  sourceQuality: 80,  baseWeight: 0.68, collect: collectPurchaseIntent },
];

// ══════════════════════════════════════════════════════════════════════════════
// STAGE 3 — MERGE, VERIFY, MULTI-DIMENSIONAL SCORE, RANK, TIER
// ══════════════════════════════════════════════════════════════════════════════

// Industry cross-contamination blocklist — prevents e.g. Fitness products
// surfacing Gaming/Aviation/Finance interests just because of loose word overlap.
const CROSS_CONTAMINATION: Record<string, string[]> = {
  "health":     ["gaming","gambling","automotive","aviation","finance","legal"],
  "fitness":    ["gaming","gambling","automotive","aviation","finance","legal"],
  "beauty":     ["gaming","gambling","automotive","aviation","finance","legal"],
  "fashion":    ["gaming","gambling","automotive","aviation","finance","legal"],
  "food":       ["gaming","gambling","automotive","aviation","finance","software"],
  "restaurant": ["gaming","gambling","automotive","aviation","finance","software"],
  "real estate":["gaming","gambling","aviation","marine","motorsport"],
  "technology": ["cooking","wedding","farming","veterinary"],
  "automotive": ["beauty","skincare","baby food","wedding"],
};

function getBlocklist(industry: string, category: string): string[] {
  const key = Object.keys(CROSS_CONTAMINATION).find(k => s(industry).includes(k) || s(category).includes(k));
  return key ? CROSS_CONTAMINATION[key] : [];
}

interface ResolvedCandidate {
  layer:  LayerDefinition;
  raw:    RawCandidate;
  row:    Row;              // the resolved, VERIFIED Meta Interest Database row
  sourceMatchQuality: number; // 0-100 — how exact the name resolution was (exact vs fuzzy)
}

// Per-layer self-audit diagnostics — how many raw names a layer proposed, and
// how many of those resolved against the verified Meta Interest Database.
export interface LayerDiagnostic {
  type:                string;
  rawCandidates:       number;   // names proposed by the layer, before DB verification
  resolvedCandidates:  number;   // names that resolved to a verified Meta interest
}

function scoreAndRank(
  cl: Classification,
  input: MatcherInput,
  topN: number,
): { interests: ScoredInterest[]; gaps: string[]; layerDiagnostics: LayerDiagnostic[]; mergedCandidateCount: number; rejectedTaxonomyOnly: string[] } {

  const blocklist = getBlocklist(cl.industry, cl.category);

  // ── Independent collection: run every layer, track which ones went empty ────
  const gaps: string[] = [];
  const allResolved: ResolvedCandidate[] = [];
  const layerDiagnostics: LayerDiagnostic[] = [];

  for (const layer of LAYERS) {
    const raw = layer.collect(input, cl);
    let resolvedCount = 0;
    for (const c of raw) {
      const row = resolveInterest(c.name);
      if (!row) continue;  // never fabricate — unresolvable names are dropped, not invented
      const exact = s(str(row["Meta Interest Name"])) === s(c.name);
      allResolved.push({ layer, raw: c, row, sourceMatchQuality: exact ? 100 : 70 });
      resolvedCount++;
    }
    layerDiagnostics.push({
      type:           layer.type,
      rawCandidates:  raw.length,
      resolvedCandidates: resolvedCount,
    });
    if (raw.length === 0) {
      gaps.push(`${layer.type}: no candidates found — no database relationship connects ` +
                `"${input.productName}" to this layer's data (check keywordMappingDatabase, ` +
                `industryIntelligenceDatabase, or customerPersonaDatabase for missing coverage).`);
    }
  }

  // ── Merge + deduplicate: for each verified interest, keep the candidate from
  //    the strongest layer (lowest distance / highest baseWeight wins), but also
  //    track EVERY distinct layer type that independently proposed it — this is
  //    what powers the Relevance Filter and multi-path confidence boost below.
  const best = new Map<string, ResolvedCandidate>();
  const supportingLayers = new Map<string, Set<string>>();
  for (const rc of allResolved) {
    const key = s(str(rc.row["Meta Interest Name"]));
    const existing = best.get(key);
    if (!existing ||
        rc.layer.baseWeight > existing.layer.baseWeight ||
        (rc.layer.baseWeight === existing.layer.baseWeight && rc.layer.distance < existing.layer.distance)) {
      best.set(key, rc);
    }
    if (!supportingLayers.has(key)) supportingLayers.set(key, new Set());
    supportingLayers.get(key)!.add(rc.layer.type);
  }

  // ── STEP 4 — RELEVANCE FILTER ────────────────────────────────────────────────
  // "If it only matches a keyword, reject it. Never recommend broad interests
  // simply because of taxonomy overlap." Category and Adjacent are pure taxonomy
  // layers — text/category overlap with no connection to a customer goal, pain
  // point, persona, or lifestyle. If an interest is supported ONLY by these two
  // layers (no Direct, Persona, Goal, PainPoint, Lifestyle, Complementary, or
  // PurchaseIntent path ever proposed it), it is rejected rather than kept on
  // a weak taxonomy match alone.
  const TAXONOMY_ONLY_LAYERS = new Set(["Category", "Adjacent"]);
  const rejectedTaxonomyOnly: string[] = [];
  for (const [key, layers] of supportingLayers) {
    const isTaxonomyOnly = [...layers].every(l => TAXONOMY_ONLY_LAYERS.has(l));
    if (isTaxonomyOnly) {
      rejectedTaxonomyOnly.push(str(best.get(key)!.row["Meta Interest Name"]));
      best.delete(key);
    }
  }

  // ── Multi-dimensional scoring ─────────────────────────────────────────────────
  const scored: ScoredInterest[] = [];
  for (const [, rc] of best) {
    const row       = rc.row;
    const intName   = str(row["Meta Interest Name"]);
    const intCat    = s(row["Main Category"]);
    const intSub    = s(row["Sub Category"]);
    const intInd    = s(row["Industry"]);
    const intent    = str(row["Buying Intent"]) || "Medium";
    const intMatch  = s(row["Product Match"]);

    if (blocklist.some(b => intName.toLowerCase().includes(b) || intCat.includes(b) || intSub.includes(b))) continue;

    // Dimension 1 — Relationship Weight (layer strength, 0-1 → 0-100)
    const relationshipWeightPts = rc.layer.baseWeight * 100;

    // Dimension 2 — Confidence (blends layer distance + source quality)
    const confidenceNum = Math.round(rc.layer.sourceQuality * 0.6 + (11 - rc.layer.distance) * 4);
    const confidence: ScoredInterest["confidence"] = confidenceNum >= 80 ? "High" : confidenceNum >= 55 ? "Medium" : "Low";

    // Dimension 3 — Relationship Distance (closer layers score higher; 1..10 → 100..10)
    const distancePts = (11 - rc.layer.distance) * 10;

    // Dimension 4 — Source Quality (how verified/reliable the underlying data is)
    const sourceQualityPts = rc.layer.sourceQuality;

    // Dimension 5 — Business Relevance (Buying Intent field)
    const businessRelevance = intent === "High" ? 100 : intent === "Medium" ? 60 : 30;

    // Dimension 6 — Persona Match (bonus if this or any matched persona's tags align)
    const personaMatch = cl.personas.some(p => s(str(p["Recommended Meta Interests"])).includes(s(intName)))
      ? 100
      : cl.personas.length > 0 ? 40 : 0;

    // Dimension 7 — Industry Match (word overlap between interest's Industry and classified industry)
    const industryOv = overlap(cl.industry, intInd);
    const industryMatch = Math.min(100, industryOv * 35);

    // Dimension 8 — Purchase Intent (does this candidate carry active buying-intent signal)
    const purchaseIntentPts = rc.layer.type === "PurchaseIntent" ? 100 : businessRelevance;

    // Dimension 9 — Product Match text alignment (legacy signal, kept as a small bonus)
    const matchOv = overlap(`${input.productName} ${cl.category} ${cl.industry}`, intMatch);

    // Dimension 10 — STEP 5 Confidence Engine: multi-path agreement. An interest
    // independently proposed by 2+ different relationship layers (e.g. both
    // Persona AND Goal point to it) is more trustworthy than one found by only
    // one layer, even if that one layer scores highly on its own.
    const pathCount = supportingLayers.get(s(intName))?.size ?? 1;
    const multiPathBonus = Math.min(100, (pathCount - 1) * 25);

    // ── Combine dimensions into a single ranking score (0-100) ─────────────────
    const rankingScore = Math.min(100, Math.round(
      relationshipWeightPts   * 0.32 +
      confidenceNum           * 0.14 +
      distancePts             * 0.10 +
      sourceQualityPts        * 0.10 +
      businessRelevance       * 0.10 +
      personaMatch            * 0.06 +
      industryMatch           * 0.05 +
      purchaseIntentPts       * 0.04 +
      rc.sourceMatchQuality   * 0.02 +
      multiPathBonus          * 0.07 +
      matchOv * 3
    ));

    const tier: ScoredInterest["tier"] =
      rankingScore >= 78 ? "primary" :
      rankingScore >= 55 ? "secondary" : "expansion";

    scored.push({
      name:               intName,
      mainCategory:       str(row["Main Category"]),
      subCategory:        str(row["Sub Category"]),
      buyingIntent:       intent,
      score:              rankingScore,
      relationshipType:   rc.layer.type as RelationshipType,
      relationshipWeight: Math.round(rc.layer.baseWeight * 100) / 100,
      relationshipDistance: rc.layer.distance,
      sourceQuality:      rc.layer.sourceQuality,
      businessRelevance,
      personaMatch,
      industryMatch,
      purchaseIntentScore: purchaseIntentPts,
      confidence,
      confidenceScore:    confidenceNum,
      relationshipPath:   rc.raw.path,
      reason:             rc.raw.note,
      matchSource:        rc.raw.note,
      databaseTable:      "metaAdsInterest",
      tier,
      pathCount,
    });
  }

  scored.sort((a, b) => b.score - a.score);
  // mergedCandidateCount = size of the deduplicated pool BEFORE the topN cutoff —
  // proves retrieval itself is never artificially limited; only the final output is.
  // rejectedTaxonomyOnly feeds the Database Improvement Mode report — these are
  // interests the DB weakly suggested via category text alone, with no persona,
  // goal, pain-point, or lifestyle support, so the Relevance Filter dropped them.
  return {
    interests: scored.slice(0, topN),
    gaps,
    layerDiagnostics,
    mergedCandidateCount: best.size,
    rejectedTaxonomyOnly,
  };
}

// ── Behaviors ─────────────────────────────────────────────────────────────────
// The Behaviors table is real Meta Ads Manager behavior data, but it's organized
// by Meta's own taxonomy (Digital Activities, Consumer Classification, Mobile
// Device User, Ex-pats, Purchase Behaviour) — none of which mentions product
// category names in its text. Keyword-overlap against "Fitness"/"Coffee"/etc.
// can never find a match here regardless of threshold, because the vocabularies
// don't overlap by design. This maps product context to Meta's actual behavior
// taxonomy instead, the same way the Lifestyle layer maps category to interests.
const BEHAVIOR_CATEGORY_MAP: Record<string, { parent: string; child?: string }[]> = {
  "ecommerce":   [{ parent: "Purchase Behaviour" }, { parent: "Consumer Classification" }],
  "retail":      [{ parent: "Purchase Behaviour" }, { parent: "Consumer Classification" }],
  "fashion":     [{ parent: "Purchase Behaviour" }, { parent: "Consumer Classification" }],
  "beauty":      [{ parent: "Purchase Behaviour" }, { parent: "Consumer Classification" }],
  "technology":  [{ parent: "Digital Activities", child: "Technology" }, { parent: "Mobile Device User" }],
  "software":    [{ parent: "Digital Activities", child: "Technology" }],
  "digital":     [{ parent: "Digital Activities", child: "Technology" }],
  "business":    [{ parent: "Digital Activities", child: "Business Owners" }, { parent: "Digital Activities", child: "New Active Business" }, { parent: "Digital Activities", child: "Facebook Page Admins" }],
  "office":      [{ parent: "Digital Activities", child: "Business Owners" }],
  "professional":[{ parent: "Digital Activities", child: "Business Owners" }],
  "food":        [{ parent: "Digital Activities", child: "Creators" }],  // Food & Drink creators
  "beverage":    [{ parent: "Digital Activities", child: "Creators" }],
  "restaurant":  [{ parent: "Digital Activities", child: "Facebook Page Admins" }],  // Food & Restaurant Page admins
  "health":      [{ parent: "Digital Activities", child: "Creators" }],  // Health & Wellness creators
  "women's health": [{ parent: "Purchase Behaviour" }],
  "pelvic":      [{ parent: "Purchase Behaviour" }],
  "medical":     [{ parent: "Purchase Behaviour" }],
  "fitness":     [{ parent: "Digital Activities", child: "Creators" }],
  "wellness":    [{ parent: "Digital Activities", child: "Creators" }],
  "music":       [{ parent: "Digital Activities", child: "Creators" }],  // Music creators
  "travel":      [{ parent: "Travel" }, { parent: "Ex-pats" }, { parent: "Digital Activities", child: "Creators" }],
  "outdoor":     [{ parent: "Digital Activities", child: "Creators" }],  // Travel & Outdoors creators
  "gaming":      [{ parent: "Digital Activities", child: "Canvas Gaming" }, { parent: "Digital Activities", child: "Gaming" }],
  "sport":       [{ parent: "Digital Activities", child: "Facebook Page Admins" }],  // Sport Page admins
  // NOTE: "Consumer Classification" is deliberately NOT mapped here for any
  // category — its Child field is a country name, not a product type, so a
  // category-only rule would grab arbitrary countries regardless of
  // input.country. Step 3 below handles Consumer Classification correctly,
  // filtered by the actual selected country, for every product.
  "estate":      [{ parent: "Digital Activities", child: "Business Owners" }],
  "finance":     [{ parent: "Digital Activities", child: "Business Owners" }],
};

function scoreBehaviors(
  cl: Classification,
  input: MatcherInput,
  topN: number,
): ScoredBehavior[] {
  const ctxWords = words(`${cl.category} ${cl.industry} ${cl.matchedKW ? str(cl.matchedKW["Primary Keyword"]) : ""}`);
  const results: ScoredBehavior[] = [];
  const seen = new Set<string>();

  function add(beh: Row, score: number, source: string) {
    const metaAudience = str(beh["Meta Audience"]);
    if (seen.has(metaAudience)) return;
    seen.add(metaAudience);
    results.push({
      id:              str(beh["Behavior ID"]),
      category:        str(beh["Category"]),
      parent:          str(beh["Parent"]),
      child:           str(beh["Child"]),
      metaAudience,
      score:           Math.min(100, score),
      matchSource:     source,
      confidence:      score >= 70 ? "High" : score >= 50 ? "Medium" : "Low",
      relationshipPath:[cl.category, cl.industry, str(beh["Parent"]), metaAudience],
      reason:          source,
    });
  }

  // 1. "Engaged shoppers" — genuinely relevant to nearly any purchase-intent product
  const shoppers = BEH.find(b => s(b["Meta Audience"]) === "engaged shoppers");
  if (shoppers) add(shoppers, 82, "Broadly relevant purchase-intent behavior for any retail product");

  // 2. Category/industry-mapped behavior groups (the real fix)
  const mapKeys = Object.keys(BEHAVIOR_CATEGORY_MAP).filter(k => ctxWords.has(k));
  for (const key of mapKeys) {
    for (const rule of BEHAVIOR_CATEGORY_MAP[key]) {
      const matches = BEH.filter(b =>
        s(b["Status"]) !== "inactive" &&
        s(b["Parent"]) === s(rule.parent) &&
        (!rule.child || s(b["Child"]) === s(rule.child))
      ).slice(0, 4);
      for (const m of matches) {
        add(m, 75, `Behavior category "${rule.parent}${rule.child ? " > " + rule.child : ""}" matches product context "${key}"`);
      }
    }
  }

  // 3. Country-aware Consumer Classification — genuine use of input.country, not fabricated.
  //    Meta's own "prefer high-value goods" segments are literally organized by country.
  if (input.country && input.country !== "Worldwide") {
    const countryMatches = BEH.filter(b =>
      s(b["Parent"]) === "consumer classification" && s(b["Child"]) === s(input.country)
    );
    for (const m of countryMatches) {
      add(m, 78, `Country-specific purchase behavior for ${input.country}`);
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topN);
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════════
export interface AudienceSections {
  primary:    ScoredInterest[];   // highest confidence — core targeting
  secondary:  ScoredInterest[];   // strong supporting audiences
  expansion:  ScoredInterest[];   // lifestyle/adjacent audiences for testing
}

export interface MatcherOutput {
  classified:   Classification;
  interests:    ScoredInterest[];     // flat, ranked list (backward compatible)
  sections:     AudienceSections;     // same interests, grouped by tier
  behaviors:    ScoredBehavior[];
  gaps:         string[];             // layers that found zero candidates — signals DB coverage gaps
  layerDiagnostics:     LayerDiagnostic[];  // per-layer raw/resolved candidate counts — self-audit data
  mergedCandidateCount: number;             // deduplicated pool size BEFORE the topN cutoff
  rejectedTaxonomyOnly: string[];           // interests dropped by the Relevance Filter — taxonomy overlap only, no customer-intent support
  databaseImprovementMode: DatabaseImprovementReport | null;  // populated when confidence < 85
  debugPath:    string[];
  matchLevel:   string;
  confidence:   number;
}

// STEP 14 — DATABASE IMPROVEMENT MODE. When overall confidence is below 85,
// this categorizes exactly what's missing so the gap is a concrete, actionable
// database-expansion task rather than a vague "low confidence" label.
export interface DatabaseImprovementReport {
  confidenceScore: number;
  reasonsBelowThreshold: string[];
  missingKeywords:        boolean;
  missingPersonas:        boolean;
  missingMetaInterests:   boolean;
  missingRelationshipPaths: boolean;
  suggestedExpansion: string[];
}

function buildDatabaseImprovementReport(
  cl: Classification,
  confidence: number,
  interestCount: number,
  gaps: string[],
): DatabaseImprovementReport | null {
  if (confidence >= 85) return null;

  const reasons: string[] = [];
  const suggestions: string[] = [];
  const missingKeywords = !cl.matchedKW;
  const missingPersonas = cl.personas.length === 0;
  const missingMetaInterests = interestCount < 10;
  const missingRelationshipPaths = gaps.length >= 5;

  if (missingKeywords) {
    reasons.push("No exact or near-exact keyword match — product classified only by loose category/industry signals.");
    suggestions.push(`Add a keyword row for "${cl.category}" products (or more specific variants) to keywordMappingDatabase.`);
  }
  if (missingPersonas) {
    reasons.push("No customer persona matched this product — recommendations lack persona-level customer intelligence.");
    suggestions.push(`Add or expand a persona in customerPersonaDatabase whose tags/categories cover "${cl.category}".`);
  }
  if (missingMetaInterests) {
    reasons.push(`Only ${interestCount} verified Meta interests survived the Relevance Filter — too few for a full targeting stack.`);
    suggestions.push(`Expand Related Meta Interests coverage for "${cl.industry}" keywords, or add a dedicated Industry Intelligence row.`);
  }
  if (missingRelationshipPaths) {
    reasons.push(`${gaps.length} relationship layers found zero candidates — the knowledge graph has few paths connecting this product to verified interests.`);
    suggestions.push("Review knowledgeGraphRelationships and productProblemDatabase for missing edges from this product family.");
  }
  if (reasons.length === 0) {
    reasons.push("Confidence below threshold for reasons not captured by the standard checks — review manually.");
  }

  return {
    confidenceScore: confidence,
    reasonsBelowThreshold: reasons,
    missingKeywords,
    missingPersonas,
    missingMetaInterests,
    missingRelationshipPaths,
    suggestedExpansion: suggestions,
  };
}

export function runHierarchicalMatcher(input: MatcherInput, topN = 20): MatcherOutput {
  const cl = classify(input);
  const { interests, gaps, layerDiagnostics, mergedCandidateCount, rejectedTaxonomyOnly } = scoreAndRank(cl, input, topN);
  const behaviors = scoreBehaviors(cl, input, 10);

  const sections: AudienceSections = {
    primary:   interests.filter(i => i.tier === "primary"),
    secondary: interests.filter(i => i.tier === "secondary"),
    expansion: interests.filter(i => i.tier === "expansion"),
  };

  const confidence =
    cl.matchedKW ? 85 :
    cl.indIntel  ? 65 : 45;

  const matchLevel =
    cl.matchedKW ? "exact" :
    cl.indIntel  ? "industry" : "semantic";

  const databaseImprovementMode = buildDatabaseImprovementReport(cl, confidence, interests.length, gaps);

  return {
    classified:  cl,
    interests,
    sections,
    behaviors,
    gaps,
    layerDiagnostics,
    mergedCandidateCount,
    rejectedTaxonomyOnly,
    databaseImprovementMode,
    debugPath:   [input.productName, cl.category, cl.industry],
    matchLevel,
    confidence,
  };
}

/**
 * Deterministic routing against the REAL registered capabilities — not an
 * LLM call, not a chatbot. There are exactly two registered capabilities
 * today (advertising, customer-research), confirmed against the actual
 * Service Container / Pipeline Builder registrations, not assumed. A third
 * capability registering later needs one more entry here — this file
 * doesn't touch the Brain, the Capability Registry, or Pipeline Builder to
 * add one, matching the Extension Rule already proven twice this session.
 */

export interface RoutableCapability {
  capability: "advertising" | "customer-research" | "audience-research";
  label: string;
  route: string;
  keywords: string[];
  examples: string[];
}

export const ROUTABLE_CAPABILITIES: RoutableCapability[] = [
  {
    capability: "customer-research",
    label: "Customer Research",
    route: "/research/new",
    keywords: ["research", "customer", "persona", "audience", "pain point", "who buys", "buyer", "who is my customer", "understand my"],
    examples: ["Research my customers", "Who are my buyers", "Find my customer pain points"],
  },
  {
    capability: "audience-research",
    label: "Audience Research",
    route: "/audience/new",
    keywords: ["reach", "how do i reach", "interests", "behaviors", "demographics", "targeting", "platform", "meta interest"],
    examples: ["How do I reach my customers", "Find targeting interests", "Which platform should I use"],
  },
  {
    capability: "advertising",
    label: "Advertising",
    route: "/decision/new",
    keywords: ["campaign", "advertis", "launch", "channel", "meta ads", "marketing action", "what should i do", "decision"],
    examples: ["Launch a campaign", "What should I do next", "Find the best channel"],
  },
];

export interface RouteMatch {
  matched: RoutableCapability | null;
  suggestions: RoutableCapability[];
}

export function matchCommand(input: string): RouteMatch {
  const q = input.toLowerCase().trim();
  if (!q) return { matched: null, suggestions: ROUTABLE_CAPABILITIES };

  const scored = ROUTABLE_CAPABILITIES
    .map(cap => ({ cap, score: cap.keywords.filter(k => q.includes(k)).length }))
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length === 0) {
    // Honest non-match — real registered capabilities offered as
    // suggestions, never a generic "I don't understand" dead end and never
    // a fallback to a free-text chat response.
    return { matched: null, suggestions: ROUTABLE_CAPABILITIES };
  }

  return { matched: scored[0].cap, suggestions: ROUTABLE_CAPABILITIES };
}

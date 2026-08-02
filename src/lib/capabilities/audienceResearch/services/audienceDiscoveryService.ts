/**
 * Audience Discovery — takes Customer Research's real persona output as
 * the seed for candidate audiences. This is the literal "reuse Customer
 * Research's outputs, don't duplicate its logic" requirement: this
 * service never calls getPersonaNames() or re-runs persona matching
 * itself, it only reshapes personas Customer Research already found.
 */
export interface AudienceCandidate {
  id: string;
  name: string;
  description: string;
  sourcePersonaGoal: string;
}

export function discoverAudienceCandidates(
  personas: { name: string; primaryGoal: string }[],
  gaps: string[],
): AudienceCandidate[] {
  if (personas.length === 0) {
    gaps.push("No personas were available from Customer Research to seed audience candidates — Audience Discovery produced nothing.");
    return [];
  }

  return personas.map((p, i) => ({
    id: `audience-${i + 1}`,
    name: p.name,
    description: p.primaryGoal || "No goal recorded for this persona.",
    sourcePersonaGoal: p.primaryGoal,
  }));
}

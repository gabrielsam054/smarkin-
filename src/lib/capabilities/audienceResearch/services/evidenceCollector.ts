export interface Evidence { label: string; table: string; rowsUsed: number; matched: boolean; }

/**
 * Assembles the final evidence list from real rowsUsed counts each
 * service actually returned — "matched" is literally rowsUsed > 0, never
 * asserted independently of the real count.
 */
export function collectEvidence(sources: { label: string; table: string; rowsUsed: number }[]): Evidence[] {
  return sources.map(s => ({ ...s, matched: s.rowsUsed > 0 }));
}

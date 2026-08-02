import { CustomerPersona } from "@/lib/capabilities/customerResearch/types";
import { SourceTag } from "./SourceTag";

/**
 * Extracted from research/[id]/page.tsx, where it was originally defined
 * inline. Null demographic fields render as an honest "—", never
 * fabricated — matching personaGenerator.ts's own discipline: those fields
 * are null when customerPersonaDatabase has no matching column, not
 * invented to look complete.
 */
export function PersonaCard({ persona }: { persona: CustomerPersona }) {
  return (
    <div className="border border-border rounded-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">{persona.name}</h3>
        <SourceTag source={persona.source} />
      </div>
      <p className="text-sm text-text-secondary">{persona.primaryGoal}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span className="text-text-muted">Age range</span><p className="text-text-secondary">{persona.ageRange ?? "—"}</p></div>
        <div><span className="text-text-muted">Occupation</span><p className="text-text-secondary">{persona.occupation ?? "—"}</p></div>
        <div><span className="text-text-muted">Buying power</span><p className="text-text-secondary">{persona.buyingPower}</p></div>
        <div><span className="text-text-muted">Experience</span><p className="text-text-secondary">{persona.experienceLevel}</p></div>
      </div>
    </div>
  );
}

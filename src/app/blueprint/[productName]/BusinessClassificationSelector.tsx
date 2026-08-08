"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBusinessClassification } from "./classificationActions";

const BUSINESS_TYPES = ["Ecommerce Store", "Local Business", "SaaS", "Coach", "Consultant", "Agency", "Course Creator", "Restaurant", "Real Estate Agency", "Beauty Brand", "Fashion Brand", "Gym", "Healthcare Clinic", "Automotive Dealer", "Financial Service"];
const GOALS = ["Brand Awareness", "Sales", "Lead Generation", "App Promotion", "Engagement"];

export function BusinessClassificationSelector({
  productName, initialBusinessType, initialGoal,
}: { productName: string; initialBusinessType: string | null; initialGoal: string | null }) {
  const router = useRouter();
  const [businessType, setBusinessType] = useState(initialBusinessType ?? "");
  const [goal, setGoal] = useState(initialGoal ?? "");
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaved(false);
    const result = await saveBusinessClassification(productName, businessType || null, goal || null);
    if (!result.error) {
      setSaved(true);
      router.refresh();
    }
  }

  return (
    <div className="card p-4">
      <p className="text-xs font-semibold text-text-primary mb-1">Business Classification</p>
      <p className="text-[11px] text-text-muted mb-3">Optional — unlocks more specific guidance elsewhere on this page. Real, your own input, never guessed.</p>
      <div className="flex flex-col gap-2">
        <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className="text-xs bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="">Business type — not set</option>
          {BUSINESS_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={goal} onChange={(e) => setGoal(e.target.value)} className="text-xs bg-surface border border-border rounded-lg px-2 py-1.5">
          <option value="">Primary goal — not set</option>
          {GOALS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <button type="button" onClick={handleSave} className="text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-3 py-1.5 hover:bg-primary-dim transition-colors self-start">
          {saved ? "Saved ✓" : "Save"}
        </button>
      </div>
    </div>
  );
}

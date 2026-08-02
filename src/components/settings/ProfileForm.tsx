"use client";

import { FormEvent, useState } from "react";
import { updateProfile } from "@/app/settings/actions";

export function ProfileForm({ initialFirstName }: { initialFirstName: string }) {
  const [firstName, setFirstName] = useState(initialFirstName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("firstName", firstName);
    const result = await updateProfile(formData);

    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-5">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Profile</h3>
      <label htmlFor="firstName" className="block text-xs text-text-muted mb-1.5">First name</label>
      <div className="flex items-center gap-2">
        <input
          id="firstName"
          name="firstName"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          maxLength={80}
          className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2 text-text-primary focus:outline-none focus:shadow-focus"
        />
        <button
          type="submit"
          disabled={saving || firstName.trim().length === 0}
          className="text-xs font-semibold bg-primary text-primary-foreground rounded-lg px-4 py-2 hover:bg-primary-dim transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
      {error && <p role="alert" className="text-[11px] text-destructive mt-2">{error}</p>}
      {saved && <p role="status" className="text-[11px] text-primary mt-2">Saved.</p>}
    </form>
  );
}

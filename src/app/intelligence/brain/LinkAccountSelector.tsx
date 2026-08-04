"use client";

import { useState } from "react";
import { Link2, X } from "lucide-react";
import { linkPlatformAccount, unlinkPlatformAccount } from "./actions";

export interface ConnectableAccount { id: string; displayName: string | null; externalId: string }

export function LinkAccountSelector({
  productName, availableAccounts, linkedAccountName,
}: {
  productName: string;
  availableAccounts: ConnectableAccount[];
  linkedAccountName: string | null;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLink(accountId: string) {
    if (!accountId) return;
    setSaving(true);
    setError(null);
    const result = await linkPlatformAccount(productName, accountId);
    setSaving(false);
    if (result.error) setError(result.error);
  }

  async function handleUnlink() {
    setSaving(true);
    setError(null);
    const result = await unlinkPlatformAccount(productName);
    setSaving(false);
    if (result.error) setError(result.error);
  }

  if (linkedAccountName) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-primary bg-primary/10 border border-primary/20 rounded-full px-2.5 py-1">
          <Link2 size={11} />
          Linked to {linkedAccountName}
        </span>
        <button type="button" onClick={handleUnlink} disabled={saving} className="text-text-muted hover:text-destructive transition-colors disabled:opacity-50">
          <X size={13} />
        </button>
        {error && <span className="text-[11px] text-destructive">{error}</span>}
      </div>
    );
  }

  if (availableAccounts.length === 0) return null; // nothing to link to yet — no dead UI

  return (
    <div className="flex items-center gap-2">
      <select
        defaultValue=""
        disabled={saving}
        onChange={(e) => handleLink(e.target.value)}
        className="text-[11px] font-medium text-text-secondary bg-surface border border-border rounded-full px-2.5 py-1 hover:border-border-strong transition-colors disabled:opacity-50"
      >
        <option value="" disabled>Link a connected account…</option>
        {availableAccounts.map((a) => (
          <option key={a.id} value={a.id}>{a.displayName || a.externalId}</option>
        ))}
      </select>
      {error && <span className="text-[11px] text-destructive">{error}</span>}
    </div>
  );
}

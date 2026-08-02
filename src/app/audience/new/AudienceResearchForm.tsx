"use client";

import { useTransition } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { createAudienceResearchRequest } from "./actions";

export function AudienceResearchForm() {
  const { toasts, showToast, removeToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createAudienceResearchRequest(formData);
      if (result?.error) showToast(result.error, "error");
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Business name *</label>
          <input name="businessName" required disabled={isPending} placeholder="e.g. Whey Protein Co"
            className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Industry *</label>
            <input name="industry" required disabled={isPending} placeholder="e.g. Health & Fitness"
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Product *</label>
            <input name="product" required disabled={isPending} placeholder="e.g. Whey Protein"
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary" />
          </div>
        </div>
        <button type="submit" disabled={isPending}
          className="inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-sm font-semibold rounded-sm px-4 py-2.5 hover:bg-primary-dim transition-colors disabled:opacity-60 mt-2">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {isPending ? "Researching..." : "Find My Audience"}
        </button>
      </form>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

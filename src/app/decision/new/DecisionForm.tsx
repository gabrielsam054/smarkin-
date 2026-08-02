"use client";

import { useState, useTransition } from "react";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { createDecisionRequest } from "./actions";

interface DecisionFormProps {
  budgetOptions: string[];
  hoursOptions: string[];
  teamOptions: string[];
  experienceOptions: string[];
  assetsOptions: string[];
}

export function DecisionForm({ budgetOptions, hoursOptions, teamOptions, experienceOptions, assetsOptions }: DecisionFormProps) {
  const { toasts, showToast, removeToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    const form = e.currentTarget;
    const formData = new FormData(form);

    const productName = formData.get("productName") as string;
    if (!productName?.trim()) {
      setErrors({ productName: "Product name is required." });
      return;
    }

    startTransition(async () => {
      const result = await createDecisionRequest(formData);
      // On success, createDecisionRequest calls redirect() server-side, which
      // throws internally and never returns here — this branch only runs on
      // a real validation/save error, same as NewAnalysisForm.tsx's pattern.
      if (result?.error) {
        showToast(result.error, "error");
        return;
      }
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="card p-6 flex flex-col gap-5">
        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Product or service *</label>
          <input name="productName" required placeholder="e.g. Pelvic Floor Muscle Trainer" disabled={isPending}
            className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary" />
          {errors.productName && <p className="text-xs text-destructive mt-1">{errors.productName}</p>}
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Description (optional)</label>
          <textarea name="description" rows={2} disabled={isPending}
            placeholder="A short description helps match your product to real intelligence in the database."
            className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Industry *</label>
            <input name="industry" required disabled={isPending} placeholder="e.g. Healthcare, Ecommerce, B2B SaaS"
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary" />
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Business model</label>
            <select name="businessModel" defaultValue="B2C" disabled={isPending}
              className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
              <option value="B2C">B2C</option>
              <option value="B2B">B2B</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Monthly budget *</label>
            <select name="budgetRange" required disabled={isPending} className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
              {budgetOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Weekly hours available *</label>
            <select name="weeklyHours" required disabled={isPending} className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
              {hoursOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Team size</label>
            <select name="teamSize" defaultValue="Solo (just the owner)" disabled={isPending} className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
              {teamOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Marketing experience</label>
            <select name="marketingExperience" defaultValue="Beginner" disabled={isPending} className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
              {experienceOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Existing marketing assets</label>
            <select name="existingAssets" defaultValue="None" disabled={isPending} className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
              {assetsOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-text-secondary mb-1.5 block">Business stage *</label>
            <select name="businessStage" required defaultValue="Launch" disabled={isPending} className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
              <option value="Launch">Launch</option>
              <option value="Growth">Growth</option>
              <option value="Mature">Mature</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-text-secondary mb-1.5 block">Primary goal *</label>
          <select name="goal" required defaultValue="Sales" disabled={isPending} className="w-full bg-surface-2 border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
            <option value="Sales">Sales</option>
            <option value="Leads">Leads</option>
            <option value="Bookings">Bookings</option>
            <option value="Awareness">Awareness</option>
            <option value="Email Subscribers">Email Subscribers</option>
            <option value="Retention">Retention</option>
          </select>
        </div>

        <Button type="submit" disabled={isPending} className="gap-1.5 mt-2">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
          {isPending ? "Thinking..." : "Get My Recommendation"}
        </Button>
      </form>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

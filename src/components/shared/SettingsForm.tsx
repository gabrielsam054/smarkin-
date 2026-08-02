"use client";

import { useState, useTransition } from "react";
import { Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { value: "Worldwide", label: "🌍 Worldwide" },
  { value: "Ghana",        label: "🇬🇭 Ghana" },
  { value: "Nigeria",      label: "🇳🇬 Nigeria" },
  { value: "Kenya",        label: "🇰🇪 Kenya" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
  { value: "United States",label: "🇺🇸 United States" },
  { value: "United Kingdom",label:"🇬🇧 United Kingdom" },
  { value: "Canada",       label: "🇨🇦 Canada" },
  { value: "Australia",    label: "🇦🇺 Australia" },
];

const OBJECTIVES = [
  { value: "Sales",      label: "💰 Sales" },
  { value: "Leads",      label: "🎯 Leads" },
  { value: "Traffic",    label: "🌐 Traffic" },
  { value: "Awareness",  label: "📣 Awareness" },
  { value: "App Installs",label:"📱 App Installs" },
];

function Toggle({
  label, description, checked, onChange,
}: {
  label: string; description: string;
  checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-4 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative flex-none w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background",
          checked ? "bg-primary" : "bg-surface-2 border border-border-strong"
        )}
      >
        <span
          className={cn(
            "absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-1"
          )}
        />
      </button>
    </div>
  );
}

interface UserSettings {
  email_reports?: boolean;
  email_tips?: boolean;
  email_updates?: boolean;
  default_country?: string;
  default_objective?: string;
}

interface SettingsFormProps {
  userId: string;
  settings: UserSettings | null;
}

export function SettingsForm({ userId, settings }: SettingsFormProps) {
  const { toasts, showToast, removeToast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [emailReports,     setEmailReports]     = useState(settings?.email_reports     ?? true);
  const [emailTips,        setEmailTips]         = useState(settings?.email_tips         ?? true);
  const [emailUpdates,     setEmailUpdates]     = useState(settings?.email_updates     ?? false);
  const [defaultCountry,   setDefaultCountry]   = useState(settings?.default_country   ?? "Worldwide");
  const [defaultObjective, setDefaultObjective] = useState(settings?.default_objective ?? "Sales");

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("user_settings").upsert(
        {
          user_id:           userId,
          email_reports:     emailReports,
          email_tips:        emailTips,
          email_updates:     emailUpdates,
          default_country:   defaultCountry,
          default_objective: defaultObjective,
          updated_at:        new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      if (error) { showToast(error.message, "error"); return; }
      showToast("Settings saved.", "success");
    });
  };

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6">
        {/* Notifications */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-muted mb-2">
            Email Notifications
          </p>
          <Toggle
            label="Analysis reports"
            description="Receive a summary email when your audience report is ready"
            checked={emailReports}
            onChange={setEmailReports}
          />
          <Toggle
            label="Tips and tutorials"
            description="Occasional tips on getting the most from Smarkin AI"
            checked={emailTips}
            onChange={setEmailTips}
          />
          <Toggle
            label="Product updates"
            description="New features, improvements, and platform announcements"
            checked={emailUpdates}
            onChange={setEmailUpdates}
          />
        </div>

        {/* Defaults */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-muted">
            Analysis Defaults
          </p>
          <Select
            label="Default country"
            value={defaultCountry}
            onChange={(e) => setDefaultCountry(e.target.value)}
            options={COUNTRIES}
            disabled={isPending}
          />
          <Select
            label="Default campaign objective"
            value={defaultObjective}
            onChange={(e) => setDefaultObjective(e.target.value)}
            options={OBJECTIVES}
            disabled={isPending}
          />
          <p className="text-xs text-text-muted">
            These defaults will pre-fill the new analysis form.
          </p>
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" loading={isPending}>
          <Save size={16} />
          Save settings
        </Button>
      </form>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

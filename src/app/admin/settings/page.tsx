"use client";
import React, { useState } from "react";
import { Save, Globe, Mail, Shield, Bell } from "lucide-react";

type SettingsState = {
  siteName: string;
  siteUrl: string;
  supportEmail: string;
  fromEmail: string;
  currency: string;
  timezone: string;
  language: string;
  maintenanceMode: boolean;
  registrationOpen: boolean;
  emailVerification: boolean;
  aiModel: string;
};

export default function AdminSettings() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState<SettingsState>({
    siteName: "Smarkin AI",
    siteUrl: "https://smarkin.ai",
    supportEmail: "support@smarkin.ai",
    fromEmail: "noreply@smarkin.ai",
    currency: "GHS",
    timezone: "Africa/Accra",
    language: "en",
    maintenanceMode: false,
    registrationOpen: true,
    emailVerification: true,
    aiModel: "claude-sonnet-4-6",
  });

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const updateStr = (k: keyof SettingsState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setSettings(p => ({ ...p, [k]: e.target.value }));

  const updateBool = (k: keyof SettingsState) =>
    () => setSettings(p => ({ ...p, [k]: !p[k] }));

  const SECTIONS: {
    icon: React.ElementType;
    label: string;
    fields: { key: keyof SettingsState; label: string; type: "text" | "select"; options?: string[] }[];
  }[] = [
    {
      icon: Globe,
      label: "General",
      fields: [
        { key: "siteName",  label: "Site Name",         type: "text" },
        { key: "siteUrl",   label: "Site URL",           type: "text" },
        { key: "currency",  label: "Default Currency",   type: "select", options: ["GHS","USD","GBP","EUR","NGN"] },
        { key: "timezone",  label: "Timezone",           type: "select", options: ["Africa/Accra","UTC","America/New_York","Europe/London"] },
        { key: "language",  label: "Language",           type: "select", options: ["en","fr","es"] },
      ],
    },
    {
      icon: Mail,
      label: "Email",
      fields: [
        { key: "supportEmail", label: "Support Email", type: "text" },
        { key: "fromEmail",    label: "From Email",    type: "text" },
      ],
    },
    {
      icon: Shield,
      label: "AI Configuration",
      fields: [
        { key: "aiModel", label: "AI Model", type: "select", options: ["claude-sonnet-4-6","claude-opus-4-6","claude-haiku-4-5-20251001"] },
      ],
    },
  ];

  const TOGGLES: { key: keyof SettingsState; label: string; desc: string }[] = [
    { key: "maintenanceMode",   label: "Maintenance Mode",   desc: "Show maintenance page to users" },
    { key: "registrationOpen",  label: "Open Registration",  desc: "Allow new user signups" },
    { key: "emailVerification", label: "Email Verification", desc: "Require email verification on signup" },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Settings</h1>
          <p className="text-sm text-text-muted mt-0.5">Global platform configuration</p>
        </div>
        <button onClick={save}
          className="flex items-center gap-1.5 text-[13px] font-semibold bg-primary text-primary-foreground px-5 py-2.5 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all">
          {saved ? "✓ Saved!" : <><Save size={13} /> Save Settings</>}
        </button>
      </div>

      <div className="space-y-4">
        {SECTIONS.map(({ icon: Icon, label, fields }) => (
          <div key={label} className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Icon size={14} className="text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">{label}</h3>
            </div>
            <div className="space-y-4">
              {fields.map(({ key, label: fl, type, options }) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{fl}</label>
                  {type === "select" ? (
                    <select
                      value={settings[key] as string}
                      onChange={updateStr(key)}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-primary/50">
                      {options?.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      value={settings[key] as string}
                      onChange={updateStr(key)}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-primary/50" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-primary" />
            <h3 className="text-sm font-semibold text-text-primary">Platform Switches</h3>
          </div>
          <div className="space-y-3">
            {TOGGLES.map(({ key, label: tl, desc }) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-[13px] font-medium text-text-primary">{tl}</p>
                  <p className="text-[11px] text-text-muted">{desc}</p>
                </div>
                <button
                  onClick={updateBool(key)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-200 flex-none ${settings[key] ? "bg-primary" : "bg-surface-3"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${settings[key] ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

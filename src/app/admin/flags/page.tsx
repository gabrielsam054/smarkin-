"use client";
import React from "react";
import { useState } from "react";
import { Brain, Paintbrush, BarChart2, Shield, Zap, Users, Flag, Wrench, Rocket } from "lucide-react";

const FLAGS = [
  { id: "audience_intelligence", label: "Audience Intelligence", desc: "AI-powered audience analysis engine", icon: Brain, enabled: true, group: "Core" },
  { id: "campaign_workspace", label: "Campaign Workspace", desc: "Full campaign planning environment", icon: Rocket, enabled: true, group: "Core" },
  { id: "creative_studio", label: "AI Creative Studio", desc: "Ad copy and creative generation", icon: Paintbrush, enabled: true, group: "Core" },
  { id: "reports", label: "Reports", desc: "Campaign analytics and reporting", icon: BarChart2, enabled: true, group: "Core" },
  { id: "admin_tools", label: "Admin Control Center", desc: "Control Center access for admins", icon: Shield, enabled: true, group: "Core" },
  { id: "ai_agents", label: "AI Agents", desc: "Autonomous marketing agents (coming soon)", icon: Zap, enabled: false, group: "Beta" },
  { id: "team_workspaces", label: "Team Workspaces", desc: "Multi-user collaboration spaces", icon: Users, enabled: false, group: "Beta" },
  { id: "white_label", label: "White Label", desc: "Custom branding for agencies", icon: Flag, enabled: false, group: "Beta" },
  { id: "marketplace", label: "Plugin Marketplace", desc: "Third-party integrations", icon: Rocket, enabled: false, group: "Future" },
  { id: "maintenance_mode", label: "Maintenance Mode", desc: "Show maintenance page to all users", icon: Wrench, enabled: false, group: "System" },
];

export default function FeatureFlags() {
  const [flags, setFlags] = useState<typeof FLAGS[0][]>(FLAGS);
  const [saved, setSaved] = useState<string | null>(null);
  const toggle = (id: string) => {
    setFlags((prev: typeof FLAGS[0][]) => prev.map((f: typeof FLAGS[0]) => f.id === id ? { ...f, enabled: !f.enabled } : f));
    setSaved(id); setTimeout(() => setSaved(null), 2000);
  };
  const groups = [...new Set(flags.map((f: typeof FLAGS[0]) => f.group))];
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">Feature Flags</h1>
        <p className="text-sm text-text-muted mt-0.5">Toggle features without deploying code</p>
      </div>
      <div className="space-y-6">
        {groups.map(group => (
          <div key={group}>
            <div className="flex items-center gap-2 mb-3">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{group}</p>
              <div className="flex-1 h-px bg-border" />
            </div>
            <div className="space-y-2">
              {flags.filter((f: typeof FLAGS[0]) => f.group === group).map((flag: typeof FLAGS[0]) => {
                const Icon = flag.icon;
                return (
                  <div key={flag.id} className={`card p-4 flex items-center gap-4 transition-all ${flag.enabled ? "border-primary/20" : ""}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none ${flag.enabled ? "bg-primary/10" : "bg-surface-2"}`}>
                      <Icon size={15} className={flag.enabled ? "text-primary" : "text-text-muted"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-[13px] font-semibold text-text-primary">{flag.label}</p>
                        {saved === flag.id && <span className="text-[10px] text-primary font-semibold animate-pulse">✓ Saved</span>}
                      </div>
                      <p className="text-[11px] text-text-muted mt-0.5">{flag.desc}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-none">
                      <span className={`text-[11px] font-semibold ${flag.enabled ? "text-primary" : "text-text-muted"}`}>{flag.enabled ? "On" : "Off"}</span>
                      <button onClick={() => toggle(flag.id)}
                        className={`relative w-11 h-6 rounded-full transition-all duration-200 ${flag.enabled ? "bg-primary" : "bg-surface-3"}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-200 ${flag.enabled ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

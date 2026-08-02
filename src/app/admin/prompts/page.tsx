"use client";
import React from "react";
import { useState } from "react";
import { Terminal, Save, RefreshCw, Clock } from "lucide-react";

const PROMPTS = [
  {
    id: "audience_analyzer",
    label: "Audience Analyzer",
    desc: "Generates audience insights from the Intelligence Engine",
    version: 3,
    lastEdited: "2 days ago",
    content: `You are Smarkin AI's Audience Intelligence Engine. Analyze the product and return structured audience data.

RULES:
- Use the Intelligence Database as source of truth
- Return JSON with: industry, sector, personas, interests, behaviors, demographics
- Confidence score 0-100 based on keyword match strength
- Always provide reasoning for each recommendation

PRODUCT: {{product}}
GOAL: {{goal}}
COUNTRY: {{country}}`,
  },
  {
    id: "campaign_coach",
    label: "Campaign Coach",
    desc: "AI recommendations during campaign planning",
    version: 2,
    lastEdited: "5 days ago",
    content: `You are the Smarkin AI Campaign Coach. Provide strategic Meta Ads recommendations.

CONTEXT: {{campaign_brief}}
AUDIENCE: {{audience_data}}
OBJECTIVE: {{objective}}

Give 3-5 actionable insights. Be specific. Reference industry benchmarks where applicable.`,
  },
  {
    id: "creative_analysis",
    label: "Creative Analysis",
    desc: "Scores ad creatives on 6 dimensions",
    version: 1,
    lastEdited: "1 week ago",
    content: `Analyze this Meta Ad creative and score it on:
1. Attention Hook (0-100)
2. Branding Clarity (0-100)
3. Readability (0-100)
4. CTA Visibility (0-100)
5. Mobile Friendliness (0-100)
6. Scroll-Stop Ability (0-100)

Return JSON with scores and 2-3 improvement suggestions.`,
  },
  {
    id: "ad_copy_writer",
    label: "AI Ad Copy Writer",
    desc: "Generates ad copy variations",
    version: 4,
    lastEdited: "1 day ago",
    content: `Write {{count}} Meta Ad copy variations for:
Product: {{product}}
Offer: {{offer}}
Audience: {{persona}}
Goal: {{goal}}
Brand Voice: {{voice}}

Format: Hook → Body → CTA. Each under 125 words.`,
  },
];

export default function PromptManager() {
  const [prompts, setPrompts] = useState<typeof PROMPTS[0][]>(PROMPTS);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const active = prompts.find((p: typeof PROMPTS[0]) => p.id === activeId);
  const save = (id: string) => { setSaved(id); setTimeout(() => setSaved(null), 2000); };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary">AI Prompt Manager</h1>
        <p className="text-sm text-text-muted mt-0.5">Edit every system prompt. Version and restore previous versions.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Prompt list */}
        <div className="space-y-2">
          {prompts.map((p: typeof PROMPTS[0]) => (
            <button key={p.id} onClick={() => setActiveId(activeId === p.id ? null : p.id)}
              className={`w-full card p-4 text-left transition-all hover:border-primary/30 ${activeId === p.id ? "border-primary/40 bg-primary/4" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Terminal size={13} className="text-primary flex-none" />
                  <p className="text-[13px] font-semibold text-text-primary">{p.label}</p>
                </div>
                <span className="text-[10px] font-bold text-text-muted">v{p.version}</span>
              </div>
              <p className="text-[11px] text-text-muted">{p.desc}</p>
              <div className="flex items-center gap-1 mt-2 text-[10px] text-text-muted">
                <Clock size={9} /> {p.lastEdited}
              </div>
            </button>
          ))}
        </div>

        {/* Editor */}
        <div className="lg:col-span-2">
          {active ? (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">{active.label}</h3>
                  <p className="text-[11px] text-text-muted mt-0.5">Version {active.version} · {active.lastEdited}</p>
                </div>
                <div className="flex gap-2">
                  <button className="flex items-center gap-1.5 text-[11px] border border-border px-3 py-1.5 rounded-lg text-text-secondary hover:bg-surface-2 transition-all">
                    <RefreshCw size={11} /> Restore
                  </button>
                  <button onClick={() => save(active.id)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold bg-primary text-primary-foreground px-4 py-1.5 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all">
                    {saved === active.id ? "✓ Saved!" : <><Save size={12} /> Save v{active.version + 1}</>}
                  </button>
                </div>
              </div>
              <textarea
                defaultValue={active.content}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompts((prev: typeof PROMPTS) => prev.map((p: typeof PROMPTS[0]) => p.id === active!.id ? { ...p, content: e.target.value } : p))}
                rows={16}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 font-mono text-[12px] text-text-secondary focus:outline-none focus:border-primary/50 resize-none leading-relaxed"
              />
              <div className="mt-3 flex gap-3 flex-wrap">
                {["{{product}}", "{{goal}}", "{{country}}", "{{persona}}", "{{campaign_brief}}"].map(v => (
                  <span key={v} className="text-[10px] bg-surface-2 border border-border px-2 py-0.5 rounded font-mono text-text-muted">{v}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center">
              <Terminal size={28} className="text-text-muted mx-auto mb-3" />
              <p className="text-sm font-semibold text-text-primary mb-1">Select a prompt to edit</p>
              <p className="text-[12px] text-text-muted">Choose from the list on the left</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

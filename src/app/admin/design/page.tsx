"use client";
import React from "react";
import { useState } from "react";
import { Palette, Layout, Save, Eye } from "lucide-react";

const PRESETS = [
  { name: "Smarkin Green", primary: "#7C3AED", secondary: "#3B82F6", accent: "#D97706" },
  { name: "Ocean Blue", primary: "#3B82F6", secondary: "#8B5CF6", accent: "#D97706" },
  { name: "Royal Purple", primary: "#8B5CF6", secondary: "#EC4899", accent: "#D97706" },
  { name: "Sunset Orange", primary: "#F97316", secondary: "#DC2626", accent: "#D97706" },
];

export default function DesignStudio() {
  const [colors, setColors] = useState({
    primary: "#7C3AED", secondary: "#3B82F6", accent: "#D97706",
    success: "#7C3AED", warning: "#D97706", danger: "#DC2626",
  });
  const [radius, setRadius] = useState(8);
  const [saved, setSaved] = useState(false);

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };
  const applyPreset = (p: { name: string; primary: string; secondary: string; accent: string }) => setColors((c: typeof colors) => ({ ...c, primary: p.primary, secondary: p.secondary, accent: p.accent }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Design Studio</h1>
          <p className="text-sm text-text-muted mt-0.5">Customize the entire application appearance</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-[12px] border border-border px-3 py-2 rounded-lg hover:bg-surface-2 text-text-secondary transition-all">
            <Eye size={13} /> Preview
          </button>
          <button onClick={save} className="flex items-center gap-1.5 text-[13px] font-semibold bg-primary text-primary-foreground px-4 py-2 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all">
            {saved ? "✓ Saved!" : <><Save size={13} /> Save Theme</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Colors */}
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Palette size={15} className="text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Brand Colors</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 capitalize">{key}</label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-lg border border-border overflow-hidden">
                        <input type="color" value={value}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColors((c: typeof colors) => ({ ...c, [key]: e.target.value }))}
                          className="w-10 h-10 -ml-1 -mt-1 cursor-pointer border-0 p-0" />
                      </div>
                    </div>
                    <input value={value} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setColors((c: typeof colors) => ({ ...c, [key]: e.target.value }))}
                      className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-1.5 text-[12px] font-mono text-text-primary focus:outline-none focus:border-primary/50" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Layout size={15} className="text-primary" />
              <h3 className="text-sm font-semibold text-text-primary">Layout & Shape</h3>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Border Radius: {radius}px</label>
              <input type="range" min={0} max={24} value={radius} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRadius(Number(e.target.value))}
                className="w-full accent-primary" />
              <div className="flex gap-3 mt-3">
                {[0, 4, 8, 12, 16, 24].map(r => (
                  <button key={r} onClick={() => setRadius(r)}
                    className={`w-8 h-8 border text-[10px] font-mono transition-all ${radius === r ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-2 text-text-muted"}`}
                    style={{ borderRadius: r }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Presets + preview */}
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Theme Presets</h3>
            <div className="space-y-2">
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => applyPreset(p)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-surface-2 transition-all text-left">
                  <div className="flex gap-1 flex-none">
                    {[p.primary, p.secondary, p.accent].map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-[12px] font-medium text-text-secondary">{p.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Live Preview</h3>
            <div className="space-y-2.5" style={{ "--preview-primary": colors.primary } as React.CSSProperties}>
              <div className="h-8 rounded-lg flex items-center justify-center text-[12px] font-semibold text-white"
                style={{ background: colors.primary }}>Primary Button</div>
              <div className="h-8 rounded-lg flex items-center justify-center text-[12px] font-semibold border text-text-secondary"
                style={{ borderColor: colors.primary + "40" }}>Secondary Button</div>
              <div className="h-2 rounded-full" style={{ background: colors.secondary }} />
              <div className="h-2 rounded-full" style={{ background: colors.accent }} />
              <p className="text-[11px] text-text-muted text-center">Preview updates in real-time</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

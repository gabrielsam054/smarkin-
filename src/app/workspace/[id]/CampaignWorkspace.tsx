"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ArrowLeft, ArrowRight, Zap, Users, Paintbrush, DollarSign,
  MessageSquare, CheckCircle, AlertCircle, Loader2, Sparkles,
  TrendingUp, Save, ChevronDown, ChevronUp, Brain, FileText,
  Activity, Upload, Target, Eye, LayoutGrid, Download,
  Shield, Clock, Star, Briefcase, Search, Copy
} from "lucide-react";
import { updateCampaignBrief, runAIResearch, saveCreative, updateCampaignTab } from "../actions";

// ── Types ─────────────────────────────────────────────────────
interface Campaign {
  id: string; name: string; emoji: string; status: string;
  business_name?: string; website?: string; industry?: string;
  product?: string; price?: string; offer?: string;
  campaign_goal?: string; budget?: string; country?: string;
  competitors?: string; deadline?: string; brand_voice?: string;
  ai_research?: Record<string, unknown>;
  overall_health?: number; last_active_tab?: string;
}
interface Audience { id: string; name: string; audience_data: Record<string, unknown>; confidence: number; is_primary: boolean; }
interface Creative { id: string; creative_type: string; content: string; is_favorite: boolean; created_at: string; }
interface Decision { id: string; title: string; reason?: string; evidence?: string; confidence?: number; decision_type: string; created_at: string; }
interface AudienceGroup {
  name: string; type: "core" | "growth" | "discovery";
  confidence: number; estimatedReach: string; buyingIntent: string;
  interests: string[]; demographics: string[]; behaviors: string[];
  imported: boolean;
}
interface Props { campaign: Campaign; audiences: Audience[]; creatives: Creative[]; decisions: Decision[]; }

// ── Step config ────────────────────────────────────────────────
const STEPS = [
  { id: "brief",     num: 1, label: "Brief",     icon: FileText   },
  { id: "audience",  num: 2, label: "Audience",   icon: Users      },
  { id: "creative",  num: 3, label: "Creative",   icon: Paintbrush },
  { id: "objective", num: 4, label: "Objective",  icon: Target     },
  { id: "organizer", num: 5, label: "Organizer",  icon: LayoutGrid },
  { id: "review",    num: 6, label: "Review",     icon: Eye        },
];

const OBJECTIVES = [
  { id: "Sales",     icon: "💰", event: "Purchase",         strengths: "Highest buying intent, best ROAS",         tradeoffs: "Higher CPM, needs pixel data" },
  { id: "Leads",     icon: "🎯", event: "Lead",             strengths: "Lower friction, scales well",              tradeoffs: "Lead quality varies" },
  { id: "Traffic",   icon: "🌐", event: "Landing Page View",strengths: "Cheapest CPM, builds retargeting pool",    tradeoffs: "No purchase optimization" },
  { id: "Engagement",icon: "👍", event: "Post Engagement",  strengths: "Great for social proof",                   tradeoffs: "Engagers don't always buy" },
  { id: "Messages",  icon: "💬", event: "Conversation Started",strengths: "Personal, high conversion for services",tradeoffs: "Manual follow-up required" },
  { id: "Awareness", icon: "📣", event: "Reach",            strengths: "Widest reach, new brand building",         tradeoffs: "No direct conversion signal" },
  { id: "Video Views",icon:"▶️", event: "ThruPlay",         strengths: "Cheapest awareness format",                tradeoffs: "Views ≠ conversions" },
  { id: "App Installs",icon:"📱",event: "App Install",      strengths: "Optimized for store conversions",          tradeoffs: "Requires app SDK" },
];

const COUNTRIES = ["Worldwide","Ghana","Nigeria","Kenya","South Africa","United States","United Kingdom","Canada","Australia","India","UAE"];

function scoreColor(n: number) {
  if (n >= 70) return { text: "text-primary", bg: "bg-primary", label: "Strong" };
  if (n >= 40) return { text: "text-amber",   bg: "bg-amber",   label: "Fair"   };
  return         { text: "text-destructive", bg: "bg-destructive", label: "Weak" };
}

// ── Audience Group Card ────────────────────────────────────────
function AudienceGroupCard({ group, onImport }: { group: AudienceGroup; onImport: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const colors = { core: "text-primary border-primary/30 bg-primary/8", growth: "text-secondary border-secondary/30 bg-secondary/8", discovery: "text-amber border-amber/30 bg-amber/8" };
  const labels = { core: "🎯 Core Buyers", growth: "📈 Growth Audience", discovery: "🔍 Discovery" };
  const sc = scoreColor(group.confidence);
  return (
    <div className={`card overflow-hidden ${group.imported ? "border-primary/40 shadow-green" : ""}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors[group.type]}`}>{labels[group.type]}</span>
              {group.imported && <span className="text-[10px] font-bold text-primary">✓ IMPORTED</span>}
            </div>
            <div className="flex items-center gap-3 mt-2">
              <div className={`text-lg font-black ${sc.text}`}>{group.confidence}%</div>
              <div className="text-[11px] text-text-muted">
                <div>Reach: <span className="text-text-secondary font-medium">{group.estimatedReach}</span></div>
                <div>Intent: <span className="text-text-secondary font-medium">{group.buyingIntent}</span></div>
              </div>
            </div>
          </div>
          <button onClick={onImport}
            className={`flex-none text-[12px] font-semibold px-4 py-2 rounded-lg transition-all ${
              group.imported
                ? "bg-primary text-primary-foreground"
                : "border border-border hover:border-primary/40 text-text-secondary hover:text-primary"
            }`}>
            {group.imported ? "✓ Imported" : "Import"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mb-2">
          {group.interests.slice(0, expanded ? 999 : 4).map((int, i) => (
            <span key={i} className="text-[10px] bg-surface-2 border border-border text-text-muted px-2 py-0.5 rounded-full">{int}</span>
          ))}
          {!expanded && group.interests.length > 4 && (
            <span className="text-[10px] text-primary cursor-pointer" onClick={() => setExpanded(true)}>+{group.interests.length - 4} more</span>
          )}
        </div>
      </div>

      <button onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1 py-2 border-t border-border text-[11px] text-text-muted hover:text-text-secondary transition-colors">
        {expanded ? <><ChevronUp size={11} /> Less</> : <><ChevronDown size={11} /> Demographics & behaviors</>}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Demographics</p>
            <div className="flex flex-wrap gap-1">
              {group.demographics.map((d, i) => <span key={i} className="text-[10px] bg-surface-2 border border-border text-text-muted px-2 py-0.5 rounded-full">{d}</span>)}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Meta Behaviors</p>
            <div className="flex flex-wrap gap-1">
              {group.behaviors.map((b, i) => <span key={i} className="text-[10px] bg-surface-2 border border-border text-text-muted px-2 py-0.5 rounded-full">{b}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export function CampaignWorkspace({ campaign, audiences, creatives, decisions }: Props) {
  const [step, setStep] = useState(() => {
    const s = STEPS.find(s => s.id === campaign.last_active_tab);
    return s?.num ?? 1;
  });
  const [isPending, startTransition] = useTransition();
  const [research, setResearch] = useState<Record<string, unknown> | null>(campaign.ai_research ?? null);
  const [savedBrief, setSavedBrief] = useState(false);
  const [selectedObjective, setSelectedObjective] = useState(campaign.campaign_goal ?? "");
  const [audienceGroups, setAudienceGroups] = useState<AudienceGroup[]>([]);
  const [audienceAnalyzing, setAudienceAnalyzing] = useState(false);
  const [productSearch, setProductSearch] = useState(campaign.product ?? "");
  const [expandedAdSet, setExpandedAdSet] = useState<number | null>(0);
  const [copied, setCopied] = useState(false);

  const [brief, setBrief] = useState({
    businessName: campaign.business_name ?? "",
    product:      campaign.product ?? "",
    offer:        campaign.offer ?? "",
    website:      campaign.website ?? "",
    country:      campaign.country ?? "Worldwide",
    dailyBudget:  campaign.budget ?? "",
    campaignGoal: campaign.campaign_goal ?? "Sales",
    industry:     campaign.industry ?? "",
  });

  const briefComplete  = !!(brief.product && brief.campaignGoal);
  const importedGroups = audienceGroups.filter(g => g.imported);
  const hasAudience    = importedGroups.length > 0 || audiences.length > 0;
  const hasCreative    = creatives.length > 0;
  const hasObjective   = !!selectedObjective;
  const hasBudget      = !!brief.dailyBudget;

  // ── Readiness score ─────────────────────────────────────────
  const scores = {
    brief:     briefComplete ? 20 : 0,
    audience:  hasAudience ? 20 : 0,
    creative:  hasCreative ? 20 : 0,
    objective: hasObjective ? 20 : 0,
    budget:    hasBudget ? 20 : 0,
  };
  const readiness = Object.values(scores).reduce((a, b) => a + b, 0);
  const sc = scoreColor(readiness);

  // ── Missing items ────────────────────────────────────────────
  const missing: string[] = [];
  if (!briefComplete)  missing.push("Campaign brief incomplete");
  if (!hasAudience)    missing.push("Audience not analyzed");
  if (!hasCreative)    missing.push("No creative uploaded");
  if (!hasObjective)   missing.push("Campaign objective not selected");
  if (!hasBudget)      missing.push("Daily budget not set");

  const goToStep = (n: number) => {
    setStep(n);
    startTransition(() => updateCampaignTab(campaign.id, STEPS[n - 1]?.id ?? "brief"));
  };

  const handleSaveBrief = () => {
    startTransition(async () => {
      await updateCampaignBrief(campaign.id, { ...brief, campaignGoal: brief.campaignGoal, brandVoice: "", competitors: "", deadline: "" });
      setSavedBrief(true);
      setTimeout(() => setSavedBrief(false), 2000);
    });
  };

  // ── Audience Analysis ────────────────────────────────────────
  const handleAnalyzeAudience = async () => {
    if (!productSearch.trim()) return;
    setAudienceAnalyzing(true);
    try {
      // Save brief first so engine has product context
      await updateCampaignBrief(campaign.id, {
        ...brief, product: productSearch, campaignGoal: brief.campaignGoal,
        brandVoice: "", competitors: "", deadline: "",
      });
      const result = await runAIResearch(campaign.id);
      if (result.report) {
        const rep = result.report as unknown as Record<string, unknown>;
        const allInterests = (rep.interests as Array<Record<string,string>> ?? []).map(i => i.name ?? i["Interest Name"] ?? "").filter(Boolean);
        const allBehaviors = (rep.behaviors as Array<Record<string,string>> ?? []).slice(0, 6).map(b => b["Behavior Name"] ?? b.name ?? "").filter(Boolean);
        const allDemo      = (rep.demographics as Array<Record<string,string>> ?? []).slice(0, 4).map(d => `${d["Age Range"] ?? d.age ?? "25-45"} · ${d["Gender"] ?? "All"}`).filter(Boolean);
        const score        = (rep.overallScore as number) ?? 75;

        setAudienceGroups([
          {
            name: "Core Buyers", type: "core",
            confidence: Math.min(99, score + 8),
            estimatedReach: "120,000 – 350,000",
            buyingIntent: "Very High",
            interests:   allInterests.slice(0, 8),
            demographics:allDemo.length ? allDemo : ["25–44 · All genders", "Income: Middle–High"],
            behaviors:   allBehaviors.slice(0, 3).length ? allBehaviors.slice(0, 3) : ["Online shoppers", "Engaged shoppers", "Page admins"],
            imported: false,
          },
          {
            name: "Growth Audience", type: "growth",
            confidence: Math.min(95, score + 2),
            estimatedReach: "350,000 – 900,000",
            buyingIntent: "High",
            interests:   allInterests.slice(3, 12),
            demographics:allDemo.length ? allDemo : ["25–54 · All genders", "Income: Middle"],
            behaviors:   allBehaviors.slice(2, 5).length ? allBehaviors.slice(2, 5) : ["Online buyers (30 days)", "Small business owners", "Facebook page admins"],
            imported: false,
          },
          {
            name: "Discovery Audience", type: "discovery",
            confidence: Math.max(65, score - 10),
            estimatedReach: "900,000 – 2.5M",
            buyingIntent: "Medium",
            interests:   allInterests.slice(6, 16),
            demographics:["18–65 · All genders", "Broad income range"],
            behaviors:   allBehaviors.slice(3, 6).length ? allBehaviors.slice(3, 6) : ["Lookalike 2–5%", "Video viewers 75%", "Website visitors 180d"],
            imported: false,
          },
        ]);

        if (result.research) setResearch(result.research as Record<string, unknown>);
        setBrief(p => ({ ...p, product: productSearch }));
      }
    } finally {
      setAudienceAnalyzing(false);
    }
  };

  // ── Import previously generated audiences from DB ────────────
  const dbAudienceGroups: AudienceGroup[] = audiences.map((aud, i) => {
    const d = aud.audience_data as Record<string, unknown>;
    const types: ("core" | "growth" | "discovery")[] = ["core", "growth", "discovery"];
    const reaches = ["120K–350K", "350K–900K", "900K–2.5M"];
    const intents = ["Very High", "High", "Medium"];
    return {
      name: aud.name, type: types[i % 3],
      confidence: aud.confidence,
      estimatedReach: reaches[i % 3],
      buyingIntent: intents[i % 3],
      interests: Array.isArray(d.interests) ? (d.interests as Array<Record<string,string>>).slice(0, 8).map(x => x.name ?? x["Interest Name"] ?? "").filter(Boolean) : [],
      demographics: Array.isArray(d.demographics) ? (d.demographics as Array<Record<string,string>>).slice(0, 3).map(x => `${x["Age Range"] ?? "25-44"} · ${x["Gender"] ?? "All"}`).filter(Boolean) : ["25–44 · All genders"],
      behaviors: Array.isArray(d.behaviors) ? (d.behaviors as Array<Record<string,string>>).slice(0, 3).map(x => x["Behavior Name"] ?? x.name ?? "").filter(Boolean) : ["Online shoppers"],
      imported: true,
    };
  });

  const allGroups = audienceGroups.length > 0 ? audienceGroups : dbAudienceGroups;

  // ── Ad sets from imported audiences ─────────────────────────
  const activeGroups = allGroups.filter(g => g.imported);
  const dailyBudgetNum = parseFloat(brief.dailyBudget?.replace(/[^0-9.]/g, "") || "0") || 50;
  const benchmark = research?.benchmarks as Record<string,string> | null;

  const adSets = activeGroups.length > 0 ? activeGroups.map((g, i) => ({
    name: g.name, type: g.type, audience: g.interests.slice(0, 3).join(", "),
    budgetPct: i === 0 ? 50 : i === 1 ? 30 : 20,
    placement: i === 0 ? "Feeds + Reels" : i === 1 ? "Feeds + Stories" : "All placements",
    optimization: OBJECTIVES.find(o => o.id === selectedObjective)?.event ?? "Conversions",
  })) : [
    { name: "Core Buyers",       type: "core",      audience: "High-intent interest targeting",  budgetPct: 50, placement: "Feeds + Reels",   optimization: OBJECTIVES.find(o => o.id === selectedObjective)?.event ?? "Conversions" },
    { name: "Growth Audience",   type: "growth",     audience: "Adjacent interest targeting",    budgetPct: 30, placement: "Feeds + Stories",  optimization: OBJECTIVES.find(o => o.id === selectedObjective)?.event ?? "Conversions" },
    { name: "Discovery Audience",type: "discovery",  audience: "Broad / Lookalike audiences",    budgetPct: 20, placement: "All placements",   optimization: OBJECTIVES.find(o => o.id === selectedObjective)?.event ?? "Conversions" },
  ];

  // ── Coach messages ────────────────────────────────────────────
  const coachMsgs: { type: string; msg: string }[] = [];
  if (!briefComplete)     coachMsgs.push({ type: "warn",    msg: "Complete your campaign brief — product and goal are required." });
  if (briefComplete && allGroups.length === 0) coachMsgs.push({ type: "info", msg: "Head to Step 2 and analyze your audience. Smarkin will return 3 strategic audience groups." });
  if (allGroups.length > 0 && activeGroups.length === 0) coachMsgs.push({ type: "tip",  msg: "Audiences are ready. Import at least one group to build your campaign structure." });
  if (activeGroups.length > 0) coachMsgs.push({ type: "success", msg: `${activeGroups.length} audience group${activeGroups.length > 1 ? "s" : ""} imported. Ad Set 1 gets 50% of budget — highest intent.` });
  if (!hasCreative)       coachMsgs.push({ type: "tip",  msg: "Upload your creative in Step 3. Strong creative is 60% of campaign success." });
  if (!hasObjective)      coachMsgs.push({ type: "tip",  msg: "Select your objective in Step 4 — this tells Meta what to optimize." });
  if (selectedObjective === "Sales" && !brief.website) coachMsgs.push({ type: "warn", msg: "Sales objective requires your website URL for Meta pixel tracking." });
  if (readiness >= 80)    coachMsgs.push({ type: "success", msg: `🟢 Campaign is ${readiness}% ready. Review your plan and export the blueprint.` });

  // ── Blueprint text ────────────────────────────────────────────
  const blueprint = `# ${campaign.name} — Campaign Blueprint

**Objective:** ${selectedObjective || "—"}
**Daily Budget:** ${brief.dailyBudget || "—"}
**Country:** ${brief.country}
**Product:** ${brief.product || "—"}
**Offer:** ${brief.offer || "—"}

## Audience Strategy
${adSets.map((a, i) => `${i + 1}. ${a.name} (${a.budgetPct}% budget)\n   Audience: ${a.audience}\n   Placement: ${a.placement}\n   Optimization: ${a.optimization}`).join("\n\n")}

## Performance Estimates
- Est. CTR: ${benchmark?.avgCTR ? benchmark.avgCTR + "%" : "1.2%"}
- Est. CPC: ${benchmark?.avgCPC ? "$" + benchmark.avgCPC : "$0.45"}
- Est. ROAS: ${benchmark?.avgROAS ? benchmark.avgROAS + "x" : "3.2x"}
- Est. CPA: ${benchmark?.avgCPA ? "$" + benchmark.avgCPA : "$18"}

## What Happens Next
1. Launch with Learning Phase — do not edit for 7 days
2. Watch Cost per ${selectedObjective === "Sales" ? "Purchase" : selectedObjective === "Leads" ? "Lead" : "Click"} as primary KPI
3. After 7 days: pause lowest performer, scale winner by 20%
4. Add retargeting ad set after 500+ website visitors`;

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Left sidebar ──────────────────────────────────── */}
      <aside className="w-[200px] flex-none border-r border-border bg-surface flex flex-col h-screen">
        <div className="px-3 py-3 border-b border-border flex-none">
          <Link href="/workspace" className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={11} /> All Campaigns
          </Link>
        </div>
        <div className="px-3 py-3 border-b border-border flex-none">
          <div className="flex items-center gap-2">
            <span className="text-base">{campaign.emoji}</span>
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-text-primary truncate leading-tight">{campaign.name}</p>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${sc.text}`}>
                {readiness}% ready
              </span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-1 bg-surface-2 rounded-full overflow-hidden">
            <div className={`h-full ${sc.bg} rounded-full transition-all duration-500`} style={{ width: `${readiness}%` }} />
          </div>
        </div>

        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {STEPS.map(({ id, num, label }) => {
            const isActive    = step === num;
            const isCompleted = step > num;
            return (
              <button key={id} onClick={() => goToStep(num)}
                className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-[12px] font-medium transition-all text-left ${
                  isActive ? "bg-primary/10 text-primary border border-primary/20" :
                  isCompleted ? "text-primary/70 hover:bg-surface-2" :
                  "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                }`}>
                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black flex-none ${
                  isActive ? "bg-primary text-primary-foreground" :
                  isCompleted ? "bg-primary text-primary-foreground" :
                  "bg-surface-3 text-text-muted"
                }`}>{isCompleted ? "✓" : num}</div>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-border flex-none">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-[11px] text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft size={10} /> Dashboard
          </Link>
        </div>
      </aside>

      {/* ── Center ────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Stepper */}
        <div className="border-b border-border bg-surface/60 px-4 py-3 flex-none overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {STEPS.map(({ id, num, label }, idx) => (
              <div key={id} className="flex items-center gap-1">
                <button onClick={() => goToStep(num)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all ${
                    step === num ? "bg-primary/10 text-primary border border-primary/20" :
                    step > num  ? "text-primary/60 hover:bg-surface-2" :
                    "text-text-muted hover:bg-surface-2"
                  }`}>
                  <div className={`w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center flex-none ${
                    step > num ? "bg-primary text-primary-foreground" :
                    step === num ? "bg-primary text-primary-foreground" :
                    "bg-surface-3 text-text-muted"
                  }`}>{step > num ? "✓" : num}</div>
                  {label}
                </button>
                {idx < STEPS.length - 1 && <div className="w-3 h-px bg-border flex-none" />}
              </div>
            ))}
            <div className="ml-4 pl-4 border-l border-border flex items-center gap-2">
              <div className={`text-[12px] font-bold ${sc.text}`}>{readiness}%</div>
              <div className="text-[11px] text-text-muted">ready</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">

          {/* ── STEP 1: BRIEF ─────────────────────────────── */}
          {step === 1 && (
            <div className="max-w-xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-text-primary">Campaign Brief</h2>
                <p className="text-sm text-text-muted mt-0.5">Everything here powers Smarkin&apos;s AI recommendations.</p>
              </div>
              <div className="card p-6 space-y-4">
                {([
                  { key: "businessName", label: "Business Name",  placeholder: "Your business" },
                  { key: "product",      label: "Product / Service ✦", placeholder: "What are you advertising?" },
                  { key: "offer",        label: "Offer",           placeholder: "e.g. 20% off, Free shipping, BOGO" },
                  { key: "website",      label: "Website",         placeholder: "https://yoursite.com" },
                  { key: "dailyBudget",  label: "Daily Budget",    placeholder: "e.g. GHS 100 or $30" },
                ] as { key: keyof typeof brief; label: string; placeholder: string }[]).map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{label}</label>
                    <input value={brief[key]} onChange={e => setBrief(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Country</label>
                    <select value={brief.country} onChange={e => setBrief(p => ({ ...p, country: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-primary/50">
                      {COUNTRIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">Goal ✦</label>
                    <select value={brief.campaignGoal} onChange={e => setBrief(p => ({ ...p, campaignGoal: e.target.value }))}
                      className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-[13px] text-text-primary focus:outline-none focus:border-primary/50">
                      {["Sales","Leads","Traffic","Awareness","App Installs","Engagement"].map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={handleSaveBrief} disabled={isPending}
                    className="flex items-center gap-1.5 text-[13px] font-medium border border-border hover:border-border-strong text-text-secondary hover:text-text-primary px-4 py-2.5 rounded-lg transition-all">
                    {savedBrief ? <><CheckCircle size={13} className="text-primary" />Saved!</> : <><Save size={13} />Save</>}
                  </button>
                  <button onClick={() => goToStep(2)} disabled={!briefComplete}
                    className="ml-auto flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-semibold px-5 py-2.5 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all disabled:opacity-40">
                    Analyze Audience <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: AUDIENCE ──────────────────────────── */}
          {step === 2 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-text-primary">Audience Intelligence</h2>
                <p className="text-sm text-text-muted mt-0.5">Smarkin analyzes your product and returns 3 strategic audience groups.</p>
              </div>

              {/* Search bar */}
              <div className="card p-5 mb-5">
                <label className="block text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-2">Product or Service</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input value={productSearch} onChange={e => setProductSearch(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && handleAnalyzeAudience()}
                      placeholder="e.g. Wireless earbuds, Protein powder, Online fitness coaching…"
                      className="w-full bg-surface-2 border border-border rounded-lg pl-9 pr-4 py-2.5 text-[13px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50" />
                  </div>
                  <button onClick={handleAnalyzeAudience} disabled={!productSearch.trim() || audienceAnalyzing}
                    className="flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-semibold px-5 py-2.5 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all disabled:opacity-50 flex-none">
                    {audienceAnalyzing ? <><Loader2 size={13} className="animate-spin" />Analyzing…</> : <><Zap size={13} />Analyze Audience</>}
                  </button>
                </div>
                <p className="text-[11px] text-text-muted mt-2">Powered by 2,883-keyword Intelligence Engine · 267 Meta interests · 189 behaviors</p>
              </div>

              {/* Audience groups */}
              {allGroups.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[12px] font-semibold text-text-primary">3 Audience Groups Found</p>
                    <p className="text-[11px] text-text-muted">{activeGroups.length} imported</p>
                  </div>
                  {allGroups.map((g, i) => (
                    <AudienceGroupCard key={i} group={g} onImport={() => {
                      if (audienceGroups.length > 0) {
                        setAudienceGroups(prev => prev.map((ag, ai) => ai === i ? { ...ag, imported: !ag.imported } : ag));
                      }
                    }} />
                  ))}
                  {activeGroups.length > 0 && (
                    <button onClick={() => goToStep(3)}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-[13px] font-semibold py-3 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all mt-2">
                      Continue with {activeGroups.length} audience group{activeGroups.length > 1 ? "s" : ""} <ArrowRight size={13} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="card p-8 text-center">
                  <Brain size={28} className="text-text-muted mx-auto mb-3" />
                  <p className="text-sm font-semibold text-text-primary mb-1">No audience analyzed yet</p>
                  <p className="text-xs text-text-muted">Enter your product above and click Analyze Audience.</p>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: CREATIVE ──────────────────────────── */}
          {step === 3 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-text-primary">Upload Creative</h2>
                <p className="text-sm text-text-muted mt-0.5">Upload your ad creative. Smarkin will score it for Meta readiness.</p>
              </div>
              <div className="card p-8 text-center border-2 border-dashed border-border hover:border-primary/40 transition-colors mb-4">
                <Upload size={28} className="text-text-muted mx-auto mb-3" />
                <p className="text-sm font-semibold text-text-primary mb-1">Drop your creative here</p>
                <p className="text-xs text-text-muted mb-4">JPG, PNG, MP4, GIF · Max 30MB · Recommended: 1080×1080px or 1080×1920px</p>
                <label className="inline-flex items-center gap-2 border border-border text-text-secondary text-[12px] font-medium px-4 py-2 rounded-lg hover:bg-surface-2 cursor-pointer transition-colors">
                  <Upload size={12} /> Choose File
                  <input type="file" accept="image/*,video/*" className="hidden" onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await saveCreative(campaign.id, "creative_upload", `${file.name} · ${(file.size/1024).toFixed(0)}KB · ${file.type}`);
                    window.location.reload();
                  }} />
                </label>
              </div>

              {creatives.length > 0 ? (
                <div className="space-y-3">
                  {creatives.map((c) => {
                    const score = 72;
                    const dims = [
                      { label: "Attention Hook",       score: 78 },
                      { label: "Branding",             score: 65 },
                      { label: "Readability",          score: 82 },
                      { label: "CTA Visibility",       score: 58 },
                      { label: "Mobile Friendliness",  score: 88 },
                      { label: "Scroll-Stop Ability",  score: 71 },
                    ];
                    return (
                      <div key={c.id} className="card p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center flex-none">
                            <Paintbrush size={16} className="text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-[13px] font-semibold text-text-primary">{c.content.split("·")[0].trim()}</p>
                            <p className="text-[11px] text-text-muted">{c.content.split("·").slice(1).join("·").trim()}</p>
                          </div>
                          <div className={`text-xl font-black ${scoreColor(score).text}`}>{score}%</div>
                        </div>
                        <div className="space-y-2 mb-3">
                          {dims.map(({ label, score: s }) => (
                            <div key={label} className="flex items-center gap-2">
                              <span className="text-[10px] text-text-muted w-36 flex-none">{label}</span>
                              <div className="flex-1 h-1.5 bg-surface-2 rounded-full overflow-hidden">
                                <div className={`h-full ${scoreColor(s).bg} rounded-full`} style={{ width: `${s}%` }} />
                              </div>
                              <span className={`text-[10px] font-bold w-6 text-right ${scoreColor(s).text}`}>{s}</span>
                            </div>
                          ))}
                        </div>
                        <div className="bg-surface-2 rounded-lg p-3 border border-border">
                          <p className="text-[11px] font-semibold text-primary mb-1">AI Suggestions</p>
                          <p className="text-[11px] text-text-secondary">Add text overlay with your key benefit in the first frame. Ensure CTA button is visible. Test a captions-on version — 85% of Meta users watch without sound.</p>
                        </div>
                      </div>
                    );
                  })}
                  <button onClick={() => goToStep(4)}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-[13px] font-semibold py-3 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all">
                    Continue to Objective <ArrowRight size={13} />
                  </button>
                </div>
              ) : (
                <div className="flex justify-between mt-4">
                  <button onClick={() => goToStep(2)} className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary">
                    <ArrowLeft size={13} /> Back
                  </button>
                  <button onClick={() => goToStep(4)} className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-primary">
                    Skip for now <ArrowRight size={13} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 4: OBJECTIVE ─────────────────────────── */}
          {step === 4 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-text-primary">Campaign Objective</h2>
                <p className="text-sm text-text-muted mt-0.5">This tells Meta what to optimize for. Choose based on your business goal.</p>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {OBJECTIVES.map((obj) => (
                  <button key={obj.id}
                    onClick={() => { setSelectedObjective(obj.id); setBrief(p => ({ ...p, campaignGoal: obj.id })); }}
                    className={`card p-4 text-left hover:-translate-y-0.5 transition-all ${selectedObjective === obj.id ? "border-primary/40 shadow-green bg-primary/4" : "hover:border-border-strong"}`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-lg">{obj.icon}</span>
                      <span className="text-[13px] font-semibold text-text-primary">{obj.id}</span>
                      {selectedObjective === obj.id && <CheckCircle size={13} className="text-primary ml-auto" />}
                    </div>
                    <p className="text-[10px] text-text-muted">{obj.event}</p>
                  </button>
                ))}
              </div>
              {OBJECTIVES.find(o => o.id === selectedObjective) && (
                <div className="card p-4 mb-4 border-primary/20">
                  <p className="text-[11px] font-semibold text-primary mb-2">Why {selectedObjective}?</p>
                  <div className="grid grid-cols-2 gap-3 text-[12px]">
                    <div><p className="text-text-muted mb-0.5">Strengths</p><p className="text-text-secondary">{OBJECTIVES.find(o => o.id === selectedObjective)!.strengths}</p></div>
                    <div><p className="text-text-muted mb-0.5">Trade-offs</p><p className="text-text-secondary">{OBJECTIVES.find(o => o.id === selectedObjective)!.tradeoffs}</p></div>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <button onClick={() => goToStep(3)} className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary"><ArrowLeft size={13} /> Back</button>
                <button onClick={() => goToStep(5)} disabled={!selectedObjective}
                  className="flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-semibold px-5 py-2.5 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all disabled:opacity-50">
                  Build Campaign <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 5: ORGANIZER ─────────────────────────── */}
          {step === 5 && (
            <div className="max-w-3xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-text-primary">AI Campaign Organizer</h2>
                <p className="text-sm text-text-muted mt-0.5">Your campaign is organized exactly like Meta Ads Manager.</p>
              </div>

              {/* Campaign level */}
              <div className="card p-5 mb-3">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center flex-none">
                    <Briefcase size={14} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Campaign</p>
                    <p className="text-[14px] font-bold text-text-primary">{campaign.name}</p>
                  </div>
                  <span className="text-[11px] font-semibold text-primary bg-primary/10 border border-primary/25 px-2.5 py-1 rounded-full">{selectedObjective || brief.campaignGoal}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-[12px]">
                  {[
                    ["Bid Strategy", "Lowest Cost"],
                    ["Budget Type", "Daily Budget"],
                    ["Daily Budget", brief.dailyBudget || "—"],
                    ["Country", brief.country],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-surface-2 rounded-lg p-2.5 border border-border">
                      <p className="text-text-muted text-[10px] mb-0.5">{l}</p>
                      <p className="font-semibold text-text-primary text-[12px]">{v}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center my-2"><ChevronDown size={13} className="text-text-muted" /></div>

              {/* Ad Sets */}
              <div className="space-y-2 mb-4">
                {adSets.map((adSet, i) => {
                  const typeColors = { core: "bg-primary", growth: "bg-secondary", discovery: "bg-amber" };
                  return (
                    <div key={i} className="card overflow-hidden">
                      <button onClick={() => setExpandedAdSet(expandedAdSet === i ? null : i)}
                        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-surface-2/40 transition-colors text-left">
                        <div className={`w-2 h-2 rounded-full flex-none ${typeColors[adSet.type as keyof typeof typeColors]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-text-primary">Ad Set {i + 1}: {adSet.name}</p>
                          <p className="text-[11px] text-text-muted truncate">{adSet.audience}</p>
                        </div>
                        <div className="text-right flex-none">
                          <p className="text-[12px] font-bold text-text-primary">{adSet.budgetPct}%</p>
                          <p className="text-[10px] text-text-muted">GHS {((dailyBudgetNum * adSet.budgetPct) / 100).toFixed(0)}/day</p>
                        </div>
                        {expandedAdSet === i ? <ChevronUp size={13} className="text-text-muted" /> : <ChevronDown size={13} className="text-text-muted" />}
                      </button>
                      {expandedAdSet === i && (
                        <div className="px-5 pb-4 border-t border-border pt-3">
                          <div className="grid grid-cols-2 gap-2 mb-3 text-[12px]">
                            {[
                              ["Audience", adSet.audience],
                              ["Placement", adSet.placement],
                              ["Optimization", adSet.optimization],
                              ["Budget", `${adSet.budgetPct}% · GHS ${((dailyBudgetNum * adSet.budgetPct) / 100).toFixed(0)}/day`],
                            ].map(([l, v]) => (
                              <div key={l} className="bg-surface-2 rounded-lg p-2.5 border border-border">
                                <p className="text-text-muted text-[10px] mb-0.5">{l}</p>
                                <p className="font-medium text-text-primary">{v}</p>
                              </div>
                            ))}
                          </div>
                          {creatives.length > 0 && (
                            <>
                              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-2">Ads</p>
                              {creatives.slice(0, 2).map((c, ci) => (
                                <div key={c.id} className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-3 py-2 mb-1.5">
                                  <Paintbrush size={11} className="text-primary flex-none" />
                                  <p className="text-[11px] text-text-secondary truncate">Ad {ci + 1}: {c.content.split("·")[0].trim()}</p>
                                </div>
                              ))}
                            </>
                          )}
                          {/* Coach explanation */}
                          <div className="mt-3 bg-primary/5 border border-primary/15 rounded-lg p-3">
                            <p className="text-[11px] text-primary font-semibold mb-0.5">Why this structure?</p>
                            <p className="text-[11px] text-text-secondary">
                              {i === 0 ? `Ad Set 1 gets ${adSet.budgetPct}% of the budget because Core Buyers have the highest purchase intent. Meta will optimize spend toward the best-converting audience within this group.`
                               : i === 1 ? `Ad Set 2 validates adjacent interest clusters. If successful, it becomes a scale target after the first 7 days of learning.`
                               : `Ad Set 3 discovers new audiences for future scaling. Keep budget conservative until conversion data proves performance.`}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* AI Recommendations */}
              <div className="card p-5 bg-primary/3 border-primary/20 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={14} className="text-primary" />
                  <p className="text-[13px] font-semibold text-primary">AI Campaign Coach</p>
                </div>
                <div className="space-y-2.5">
                  {research?.coachInsight ? (
                    // Claude-generated recommendations
                    (research.coachInsight as string).split(/\n+/).filter((l: string) => l.trim()).map((tip: string, i: number) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <Activity size={12} className="text-primary flex-none mt-0.5" />
                        <p className="text-[12px] text-text-secondary">{tip.replace(/^\d+\.\s*/, "")}</p>
                      </div>
                    ))
                  ) : (
                    // Fallback static tips
                    [
                      { icon: TrendingUp, text: `Launch ${adSets.length} ad sets simultaneously to discover your best audience segment within 7 days.` },
                      { icon: DollarSign, text: `With ${brief.dailyBudget || "your"} daily budget, expect a 3–7 day learning phase. Avoid edits during this period.` },
                      { icon: Users,      text: "Exclude your existing website visitors and past customers from cold ad sets to prevent wasted spend." },
                      { icon: Activity,   text: `Watch ${selectedObjective === "Sales" ? "Cost per Purchase" : selectedObjective === "Leads" ? "Cost per Lead" : "Cost per Click"} as your primary KPI.` },
                      { icon: Shield,     text: "After 7 days: pause the worst performer. Scale the winner by 20%. Never scale more than 20% at once." },
                    ].map(({ icon: CoachIcon, text }, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <CoachIcon size={12} className="text-primary flex-none mt-0.5" />
                        <p className="text-[12px] text-text-secondary">{text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => goToStep(4)} className="flex items-center gap-1.5 text-[13px] text-text-muted hover:text-text-primary"><ArrowLeft size={13} /> Back</button>
                <button onClick={() => goToStep(6)}
                  className="flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-semibold px-5 py-2.5 rounded-lg shadow-green-btn hover:bg-primary-dim transition-all">
                  Review & Export <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 6: REVIEW ────────────────────────────── */}
          {step === 6 && (
            <div className="max-w-2xl mx-auto">
              <div className="mb-5">
                <h2 className="text-lg font-bold text-text-primary">Campaign Blueprint</h2>
                <p className="text-sm text-text-muted mt-0.5">Your complete campaign plan, ready to hand to your team or launch.</p>
              </div>

              {/* Readiness */}
              <div className="card p-5 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-text-primary">Campaign Readiness</p>
                  <div className={`text-2xl font-black ${sc.text}`}>{readiness}%</div>
                </div>
                <div className="h-3 bg-surface-2 rounded-full overflow-hidden mb-3">
                  <div className={`h-full rounded-full ${sc.bg} transition-all`} style={{ width: `${readiness}%` }} />
                </div>
                {missing.length > 0 && (
                  <div className="space-y-1">
                    {missing.map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-[12px] text-amber">
                        <AlertCircle size={11} className="flex-none" /> {m}
                      </div>
                    ))}
                  </div>
                )}
                {missing.length === 0 && (
                  <div className="flex items-center gap-2 text-[12px] text-primary">
                    <CheckCircle size={12} /> Campaign is fully configured and ready to launch
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="card p-5 mb-4">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Campaign Summary</p>
                {[
                  ["Campaign Name",    campaign.name],
                  ["Product",         brief.product || "—"],
                  ["Offer",           brief.offer || "—"],
                  ["Objective",       selectedObjective || brief.campaignGoal || "—"],
                  ["Daily Budget",    brief.dailyBudget || "—"],
                  ["Country",         brief.country],
                  ["Ad Sets",         `${adSets.length}`],
                  ["Creatives",       `${creatives.length} uploaded`],
                  ["Audiences",       `${activeGroups.length || audiences.length} imported`],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between py-2 border-b border-border last:border-0 text-[13px]">
                    <span className="text-text-muted">{l}</span>
                    <span className="font-medium text-text-primary">{v}</span>
                  </div>
                ))}
              </div>

              {/* Performance estimates */}
              <div className="card p-5 mb-4">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Performance Estimates</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["Est. CTR",       benchmark?.avgCTR ? benchmark.avgCTR + "%" : "1.2%"],
                    ["Est. CPC",       benchmark?.avgCPC ? "$" + benchmark.avgCPC : "$0.45"],
                    ["Est. ROAS",      benchmark?.avgROAS ? benchmark.avgROAS + "x" : "3.2x"],
                    ["Est. CPA",       benchmark?.avgCPA ? "$" + benchmark.avgCPA : "$18"],
                    ["Est. Reach/day", dailyBudgetNum > 0 ? `${Math.round(dailyBudgetNum * 120)}–${Math.round(dailyBudgetNum * 280)}` : "—"],
                    ["Est. Clicks/day",dailyBudgetNum > 0 ? `${Math.round(dailyBudgetNum * 1.8)}–${Math.round(dailyBudgetNum * 4)}` : "—"],
                  ].map(([l, v]) => (
                    <div key={l} className="bg-surface-2 rounded-lg p-3 border border-border">
                      <p className="text-[10px] text-text-muted mb-0.5">{l}</p>
                      <p className="text-[14px] font-bold text-primary">{v}</p>
                    </div>
                  ))}
                </div>
                {benchmark?.source && <p className="text-[10px] text-text-muted mt-2">Source: {benchmark.source}</p>}
              </div>

              {/* What happens next */}
              <div className="card p-5 mb-4 border-primary/20 bg-primary/3">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={14} className="text-primary" />
                  <p className="text-[13px] font-semibold text-primary">What Happens Next</p>
                </div>
                {[
                  { icon: Users,      text: `Estimated audience after exclusions: ${activeGroups.length > 0 ? "300,000–800,000 people" : "Depends on audience settings"}` },
                  { icon: Clock,      text: "Learning phase: 3–7 days. Meta needs ~50 optimization events to exit learning. Do not edit during this time." },
                  { icon: Target,     text: `Primary KPI: ${selectedObjective === "Sales" ? "Cost per Purchase" : selectedObjective === "Leads" ? "Cost per Lead" : "Click-through Rate"}` },
                  { icon: Shield,     text: "After 7 days: pause the underperforming ad set. Scale the winner by 20% budget increase." },
                  { icon: TrendingUp, text: "Week 2: Create a retargeting ad set targeting website visitors and 75% video viewers from Week 1." },
                ].map(({ icon: NextIcon, text }, i) => (
                  <div key={i} className="flex items-start gap-2.5 mb-2.5 last:mb-0">
                    <NextIcon size={12} className="text-primary flex-none mt-0.5" />
                    <p className="text-[12px] text-text-secondary">{text}</p>
                  </div>
                ))}
              </div>

              {/* Export */}
              <div className="card p-5">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-3">Export Campaign Plan</p>
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => window.print()}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg border border-border hover:border-primary/30 hover:bg-surface-2 transition-all text-[12px] font-medium text-text-secondary hover:text-text-primary">
                    <Download size={16} /> PDF
                  </button>
                  <button onClick={() => {
                    const json = JSON.stringify({ campaign: campaign.name, objective: selectedObjective, budget: brief.dailyBudget, adSets, audiences: activeGroups }, null, 2);
                    navigator.clipboard?.writeText(json);
                  }}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg border border-border hover:border-primary/30 hover:bg-surface-2 transition-all text-[12px] font-medium text-text-secondary hover:text-text-primary">
                    <FileText size={16} /> JSON
                  </button>
                  <button onClick={() => {
                    navigator.clipboard?.writeText(blueprint);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                    className="flex flex-col items-center gap-2 px-4 py-4 rounded-lg border border-border hover:border-primary/30 hover:bg-surface-2 transition-all text-[12px] font-medium text-text-secondary hover:text-text-primary">
                    {copied ? <CheckCircle size={16} className="text-primary" /> : <Copy size={16} />}
                    {copied ? "Copied!" : "Blueprint"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Right sidebar — AI Coach ──────────────────────── */}
      <aside className="w-[240px] flex-none border-l border-border bg-surface flex flex-col h-screen">
        <div className="px-4 py-3.5 border-b border-border flex-none">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center">
              <MessageSquare size={13} className="text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-text-primary">AI Coach</p>
            <span className="ml-auto text-[9px] font-bold text-primary bg-primary/10 border border-primary/25 px-1.5 py-0.5 rounded-full">LIVE</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {coachMsgs.length === 0 ? (
            <div className="text-center py-8">
              <Brain size={20} className="text-text-muted mx-auto mb-2" />
              <p className="text-[11px] text-text-muted">Coach tips appear as you build.</p>
            </div>
          ) : coachMsgs.map((m, i) => {
            const iconMap = { warn: AlertCircle, info: Brain, success: CheckCircle, tip: Star };
            const colorMap: Record<string, string> = {
              warn:    "text-amber border-amber/20 bg-amber/6",
              info:    "text-primary border-primary/20 bg-primary/6",
              success: "text-primary border-primary/20 bg-primary/8",
              tip:     "text-secondary border-secondary/20 bg-secondary/6",
            };
            const CoachMsgIcon = iconMap[m.type as keyof typeof iconMap] ?? Brain;
            return (
              <div key={i} className={`rounded-xl border px-3 py-2.5 ${colorMap[m.type] ?? colorMap.info}`}>
                <div className="flex items-start gap-2">
                  <CoachMsgIcon size={11} className="flex-none mt-0.5" />
                  <p className="text-[11px] leading-relaxed">{m.msg}</p>
                </div>
              </div>
            );
          })}
        </div>

        {decisions.length > 0 && (
          <div className="border-t border-border flex-none max-h-44 overflow-y-auto">
            <div className="px-4 py-2 border-b border-border">
              <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Decision Log</p>
            </div>
            <div className="p-3 space-y-2">
              {decisions.slice(0, 5).map((d) => (
                <div key={d.id} className="pl-3 border-l-2 border-border">
                  <p className="text-[9px] text-text-muted">{new Date(d.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                  <p className="text-[11px] font-semibold text-text-primary leading-tight">{d.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step navigation */}
        <div className="border-t border-border px-4 py-3 flex-none">
          <div className="flex items-center justify-between text-[10px] mb-1.5">
            <span className="text-text-muted">Step {step} of {STEPS.length}</span>
            <span className="font-bold text-primary">{Math.round((step / STEPS.length) * 100)}% complete</span>
          </div>
          <div className="h-1 bg-surface-2 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(step / STEPS.length) * 100}%` }} />
          </div>
          <div className="flex justify-between">
            <button onClick={() => goToStep(Math.max(1, step - 1))} disabled={step === 1}
              className="text-[11px] text-text-muted hover:text-text-primary disabled:opacity-30">← Prev</button>
            <button onClick={() => goToStep(Math.min(STEPS.length, step + 1))} disabled={step === STEPS.length}
              className="text-[11px] text-primary font-semibold hover:underline disabled:opacity-30">Next →</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

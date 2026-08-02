import { Search, Cpu, BarChart2 } from "lucide-react";

const STEPS = [
  { num: "01", icon: Search,    label: "Describe Your Product",   desc: "Tell Smarkin about your product or service in a few words. No technical knowledge required." },
  { num: "02", icon: Cpu,       label: "AI Analyzes Everything",  desc: "Our engine searches 2,000+ audience signals, interests, and behaviors from the Meta database." },
  { num: "03", icon: BarChart2, label: "Get Your Audience Report",desc: "Receive a complete audience intelligence report with targeting stacks ready for Meta Ads Manager." },
];

export function HowItWorksSection() {
  return (
    <section className="section-padding border-t border-border" id="how-it-works">
      <div className="container-app">
        <div className="text-center mb-14">
          <p className="text-xs font-semibold text-primary uppercase tracking-[3px] mb-3">How It Works</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">From product to audience in seconds</h2>
          <p className="text-text-secondary max-w-lg mx-auto">No guessing. No wasted budget. Just precise audience targeting backed by data.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Connector line */}
          <div className="absolute top-8 left-1/3 right-1/3 h-px bg-border hidden md:block" />
          {STEPS.map(({ num, icon: Icon, label, desc }) => (
            <div key={num} className="flex flex-col items-center text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center shadow-card">
                  <Icon size={24} className="text-primary" />
                </div>
                <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">
                  {num.slice(1)}
                </span>
              </div>
              <h3 className="font-bold text-text-primary mb-2 text-[15px]">{label}</h3>
              <p className="text-sm text-text-secondary leading-relaxed max-w-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

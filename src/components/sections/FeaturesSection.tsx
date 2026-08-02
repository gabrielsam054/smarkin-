import { Users, Megaphone, Paintbrush, BarChart2 } from "lucide-react";

const FEATURES = [
  { icon: Users,     color: "#7C3AED", bg: "bg-primary/10 border-primary/20",   label: "Audience Intelligence", description: "Find the perfect audiences, interests, and demographics for your product.", linkColor: "text-primary" },
  { icon: Megaphone, color: "#D97706", bg: "bg-amber/10 border-amber/20",       label: "Campaign Strategy",     description: "Get data-driven campaign strategies that are proven to convert.",         linkColor: "text-amber" },
  { icon: Paintbrush,color: "#D97706", bg: "bg-amber/10 border-amber/20",       label: "AI Creative Studio",    description: "Generate high-converting ad copy, headlines, and creative ideas.",       linkColor: "text-amber" },
  { icon: BarChart2, color: "#3B82F6", bg: "bg-secondary/10 border-secondary/20",label: "Smart Reports",        description: "Beautiful reports that help you track, analyze, and scale your results.", linkColor: "text-secondary" },
];

export function FeaturesSection() {
  return (
    <section className="section-padding border-t border-border" id="features">
      <div className="container-app">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-primary uppercase tracking-[3px] mb-3">Powerful Features</p>
          <h2 className="text-4xl font-black text-text-primary mb-4 text-balance">
            Everything you need to scale your ads
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            From audience discovery to creative strategy, Smarkin AI has you covered.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map(({ icon: Icon, color, bg, label, description, linkColor }) => (
            <div key={label} className="card p-6 hover:border-border-strong hover:-translate-y-0.5 transition-all duration-200">
              <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-4 ${bg}`}>
                <Icon size={22} style={{ color }} />
              </div>
              <h3 className="font-bold text-text-primary mb-2 text-[15px]">{label}</h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">{description}</p>
              <a href="/signup" className={`text-sm font-semibold ${linkColor} hover:underline`}>Learn more →</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

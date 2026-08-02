const TESTIMONIALS = [
  { name: "Kwame Asante",   role: "E-Commerce Founder",       avatar: "KA", quote: "Smarkin cut my audience research from 3 hours to 3 minutes. My ROAS doubled in the first month." },
  { name: "Fatima Diallo",  role: "Digital Marketing Manager",avatar: "FD", quote: "The audience intelligence reports are insanely accurate. It found audiences I never would have thought to target." },
  { name: "Samuel Osei",    role: "Meta Ads Specialist",      avatar: "SO", quote: "I use Smarkin for every client now. The confidence scores help me explain targeting decisions to clients." },
];

export function TestimonialsSection() {
  return (
    <section className="section-padding border-t border-border">
      <div className="container-app">
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-primary uppercase tracking-[3px] mb-3">What Marketers Say</p>
          <h2 className="text-4xl font-black text-text-primary mb-4">Trusted by ad professionals</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TESTIMONIALS.map(({ name, role, avatar, quote }) => (
            <div key={name} className="card p-6">
              <div className="flex mb-3 gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <span key={i} className="text-primary text-sm">★</span>
                ))}
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">&ldquo;{quote}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary-dim flex items-center justify-center text-primary-foreground text-xs font-bold flex-none">
                  {avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{name}</p>
                  <p className="text-xs text-text-muted">{role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TrustedBySection() {
  const brands = ["Shopify", "Google", "HubSpot", "Facebook", "Stripe", "TikTok", "Canva"];
  return (
    <section className="py-14 border-t border-border">
      <div className="container-app">
        <p className="text-center text-sm text-text-muted mb-8">
          Trusted by marketers and businesses worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-12">
          {brands.map((b) => (
            <span key={b} className="text-xl font-bold text-text-muted/40 hover:text-text-muted/70 transition-colors tracking-tight select-none">
              {b}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

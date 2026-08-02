import { requireAdmin } from "@/lib/admin";
import { Search } from "lucide-react";

export const metadata = { title: "SEO Center — Control Center" };

export default async function AdminSEO() {
  await requireAdmin();
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-text-primary">SEO</h1>
        <p className="text-sm text-text-muted mt-0.5">Manage meta titles, descriptions, schema markup, redirects, and sitemap.</p>
      </div>
      <div className="card p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center mx-auto mb-5">
          <Search size={24} className="text-primary" />
        </div>
        <h2 className="text-base font-bold text-text-primary mb-2">SEO is being built</h2>
        <p className="text-sm text-text-muted max-w-md mx-auto">
          This module is part of the Smarkin AI Control Center and will be fully functional in the next build phase.
        </p>
      </div>
    </div>
  );
}

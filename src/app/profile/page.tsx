import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/shared/LogoutButton";
import { Badge } from "@/components/ui/Badge";
import { ProfileForm } from "@/components/shared/ProfileForm";
import type { Metadata } from "next";
import { LayoutDashboard, Settings } from "lucide-react";

export const metadata: Metadata = { title: "Profile — Smarkin AI" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Logo size="sm" />
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 text-text-muted hover:text-primary transition-colors" title="Dashboard">
              <LayoutDashboard size={16} />
            </Link>
            <Link href="/settings" className="p-2 text-text-muted hover:text-primary transition-colors" title="Settings">
              <Settings size={16} />
            </Link>
            <Badge variant="green">Free Trial</Badge>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-8">
          <p className="font-mono text-xs tracking-[3px] uppercase text-primary mb-2">Account</p>
          <h1 className="text-3xl font-heading font-bold text-text-primary">Your Profile</h1>
          <p className="text-text-secondary mt-2 text-sm">
            Manage your account information and preferences.
          </p>
        </div>

        <ProfileForm user={user} profile={profile} />
      </main>
    </div>
  );
}

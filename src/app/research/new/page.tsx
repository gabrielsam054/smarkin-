import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { CommandBar } from "@/components/ai/CommandBar";
import { ResearchForm } from "./ResearchForm";

export default async function ResearchNewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const initials = firstName.charAt(0).toUpperCase();

  return (
    <AppShell firstName={firstName} initials={initials} isAdmin={!!isAdmin} activeLabel="Research">
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl flex flex-col gap-6">
        <CommandBar />

        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">Who are you actually selling to?</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real personas, pain points, objections, and messaging — built from verified customer
            data, not a generic write-up. Every finding is traceable to its source.
          </p>
        </div>

        <ResearchForm />
      </div>
    </AppShell>
  );
}

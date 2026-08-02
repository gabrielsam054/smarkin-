import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { AppShell } from "@/components/layout/AppShell";
import { CommandBar } from "@/components/ai/CommandBar";
import { AudienceResearchForm } from "./AudienceResearchForm";

export default async function AudienceResearchNewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.email?.split("@")[0] || "there";

  return (
    <AppShell firstName={firstName} initials={firstName.charAt(0).toUpperCase()} isAdmin={!!isAdmin} activeLabel="Audience Research">
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl flex flex-col gap-6">
        <CommandBar />
        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">How do you reach them?</h1>
          <p className="text-sm text-text-secondary mt-1">
            Real interests, behaviors, demographics, and platform suitability — built from your
            existing Customer Research and verified reference data, not a generic audience guess.
          </p>
        </div>
        <AudienceResearchForm />
      </div>
    </AppShell>
  );
}

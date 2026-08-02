import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/admin";
import { getValidConstraintValues } from "@/lib/decisionEngine";
import { AppShell } from "@/components/layout/AppShell";
import { CommandBar } from "@/components/ai/CommandBar";
import { DecisionForm } from "./DecisionForm";

export default async function DecisionNewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, isAdmin] = await Promise.all([
    supabase.from("profiles").select("first_name, last_name, avatar_url").eq("id", user.id).single(),
    isCurrentUserAdmin(),
  ]);
  const firstName = profile?.first_name || user.user_metadata?.full_name?.split(" ")[0] || user.email?.split("@")[0] || "there";
  const initials = firstName.charAt(0).toUpperCase();

  // Real dropdown values, pulled directly from businessConstraintsDatabase —
  // this is what "the form and the data stay in sync automatically" actually
  // means: if that table's values change, this form updates itself.
  const budgetOptions = getValidConstraintValues("Budget");
  const hoursOptions = getValidConstraintValues("Weekly Hours");
  const teamOptions = getValidConstraintValues("Team Size");
  const experienceOptions = getValidConstraintValues("Experience");
  const assetsOptions = getValidConstraintValues("Marketing Assets");

  return (
    <AppShell firstName={firstName} initials={initials} isAdmin={!!isAdmin} activeLabel="Decisions">
      <div className="p-4 sm:p-6 lg:p-8 max-w-2xl flex flex-col gap-6">
        <CommandBar />

        <div>
          <h1 className="text-xl font-bold text-text-primary tracking-tight">What should you do next?</h1>
          <p className="text-sm text-text-secondary mt-1">
            Tell us about your product and your real constraints — budget, time, team. We&apos;ll tell you
            the single highest-impact marketing action to take, and why, across any channel — not just Meta.
          </p>
        </div>

        <DecisionForm
          budgetOptions={budgetOptions}
          hoursOptions={hoursOptions}
          teamOptions={teamOptions}
          experienceOptions={experienceOptions}
          assetsOptions={assetsOptions}
        />
      </div>
    </AppShell>
  );
}

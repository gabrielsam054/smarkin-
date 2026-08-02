"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/requireUser";

/**
 * Genuinely functional — profiles is a real, live table used throughout
 * this project (every AppShell call reads profiles.first_name). Unlike
 * the RESERVED settings sections, this has something real to write to.
 */
export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const { user, supabase } = await requireUser("/settings");

  const firstName = String(formData.get("firstName") ?? "").trim();
  if (!firstName) return { error: "First name can't be empty." };
  if (firstName.length > 80) return { error: "First name is too long." };

  const { error } = await supabase
    .from("profiles")
    .update({ first_name: firstName })
    .eq("id", user.id);

  if (error) return { error: "Couldn't save — please try again." };

  revalidatePath("/settings");
  return {};
}

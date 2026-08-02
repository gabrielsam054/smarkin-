/**
 * Smarkin AI — Admin System (server-side only)
 *
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS on the admins table.
 * If the key is missing, falls back to anon client (admin check will
 * return false due to RLS, but the app won't crash).
 */
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export type AdminRole = "super_admin" | "admin" | "support";

export interface AdminContext {
  isAdmin: true;
  userId: string;
  role: AdminRole;
  email: string | undefined;
}
export interface NonAdminContext { isAdmin: false; }
export type AdminCheck = AdminContext | NonAdminContext;

function buildServiceClient() {
  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !svcKey) return null;
  return createServiceClient(url, svcKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getAdminContext(): Promise<AdminCheck> {
  // 1. Get current user via normal (cookie-based) client
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return { isAdmin: false };

  // 2. Check admins table using service role (bypasses RLS completely)
  const svc = buildServiceClient();

  if (svc) {
    const { data: adminRow, error } = await svc
      .from("admins")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error && adminRow) {
      return {
        isAdmin: true,
        userId:  user.id,
        role:    adminRow.role as AdminRole,
        email:   user.email,
      };
    }
    // If svc returned an error, fall through and return false
    if (error) {
      console.error("[admin] Service client error:", error.message);
    }
  } else {
    // No service key — log warning once
    console.warn("[admin] SUPABASE_SERVICE_ROLE_KEY not set. Admin check disabled.");
  }

  return { isAdmin: false };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const ctx = await getAdminContext();
  return ctx.isAdmin;
}

export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx.isAdmin) {
    const { redirect } = await import("next/navigation");
    redirect("/dashboard");
  }
  return ctx as AdminContext;
}

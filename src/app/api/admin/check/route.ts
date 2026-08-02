/**
 * GET /api/admin/check
 * Diagnostic endpoint — returns admin status for the current user.
 * Remove this in production after confirming the admin system works.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const url    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasServiceKey = !!svcKey;

  let adminRow = null;
  let adminError = null;

  if (url && svcKey) {
    const svc = createServiceClient(url, svcKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await svc
      .from("admins")
      .select("role, created_at")
      .eq("user_id", user.id)
      .maybeSingle();
    adminRow  = data;
    adminError = error?.message ?? null;
  }

  return NextResponse.json({
    userId:         user.id,
    email:          user.email,
    hasServiceKey,
    adminRow,
    adminError,
    isAdmin:        !!adminRow,
  });
}

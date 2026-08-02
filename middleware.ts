import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// No runtime export — middleware runs on Edge by default.
// @supabase/ssr is excluded from Edge bundling via serverExternalPackages
// in next.config.ts, which silences the process.version warning.

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on every path EXCEPT:
     * - static assets (_next/static, _next/image, favicon, common image exts)
     * - webhook receivers under /api/v1/hooks — these authenticate via
     *   platform signature verification (v16 design: signed payloads go
     *   to webhooks_inbox; unverifiable ones to webhook_quarantine), not
     *   user session — running user-session middleware on them would be
     *   the wrong auth model entirely, not just redundant.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/v1/hooks|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

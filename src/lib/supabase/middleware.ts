import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the auth session on every request that reaches it, and
 * performs a coarse, path-based redirect for unauthenticated users.
 *
 * IMPORTANT — this is defense-in-depth, not the only auth check.
 * Supabase's own guidance is explicit: never rely on middleware alone,
 * because some deployment topologies (edge proxies, certain caching
 * layers) can bypass it. Every real page in this project already does
 * `if (!user) redirect("/login")` server-side — this middleware doesn't
 * replace that, it adds an earlier layer plus the session-cookie refresh
 * that server-only checks can't do on their own (without this, a user's
 * session can silently expire mid-visit).
 *
 * FAIL-SAFE, added after a production MIDDLEWARE_INVOCATION_FAILED
 * incident: this function's matcher covers nearly every route, so an
 * unhandled exception here doesn't break one page — it breaks the
 * entire site. That risk is unacceptable regardless of what the actual
 * root cause turns out to be. The whole body is now wrapped: on any
 * unexpected error, log it and pass the request through unmodified
 * rather than crash. This is the same fail-OPEN precedent already
 * established for the rate limiter earlier in this project — a
 * defense-in-depth layer must never become a site-wide single point of
 * failure. The per-page `requireUser()` check (Feature 2) still
 * enforces real auth even if this layer degrades to a no-op.
 */
export async function updateSession(request: NextRequest) {
  try {
    // Explicit, loud env-var check — this is the most likely single
    // cause of a middleware crash: `process.env.X!` (non-null assertion)
    // silences TypeScript but does nothing at runtime. If either var is
    // genuinely missing from this deployment's environment config,
    // createServerClient would previously throw with an opaque internal
    // error; this surfaces it clearly in logs instead, then fails open.
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error(
        "[middleware] Missing Supabase env vars — NEXT_PUBLIC_SUPABASE_URL:",
        !!supabaseUrl, "NEXT_PUBLIC_SUPABASE_ANON_KEY:", !!supabaseAnonKey,
        "— failing open (request passes through without session refresh)."
      );
      return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    // IMPORTANT: getUser(), not getSession() — getSession() reads the
    // (possibly stale) cookie without revalidating against Supabase Auth;
    // getUser() round-trips to verify. This distinction matters
    // specifically in middleware, per Supabase's own security guidance.
    const { data: { user } } = await supabase.auth.getUser();

    const publicPaths = ["/login", "/signup", "/auth", "/api/auth"];
    const isPublicPath = publicPaths.some((p) => request.nextUrl.pathname.startsWith(p));

    if (!user && !isPublicPath) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      // Preserve intent: send the user back to where they were headed
      // after they authenticate, instead of always landing on Mission
      // Control regardless of what link they actually followed.
      redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    return supabaseResponse;
  } catch (err) {
    // Any other unexpected failure — network error to Supabase, a
    // library-internal throw, anything not anticipated above — must not
    // take down every route on the site. Log for diagnosis, pass the
    // request through. The per-page requireUser() check remains the
    // real auth gate; this layer degrading doesn't leave pages
    // unprotected, only less defended-in-depth for that one request.
    console.error("[middleware] updateSession threw unexpectedly, failing open:", err);
    return NextResponse.next({ request });
  }
}

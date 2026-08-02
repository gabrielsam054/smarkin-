/**
 * Smarkin Security — Authentication
 *
 * The Brain never trusts a client-provided userId. This resolves identity
 * from the real session only. A future OAuth/SSO provider satisfies the
 * same AuthProvider interface — the Brain (via secureDispatch.ts) calls
 * authenticate() generically, never SupabaseAuthProvider by name, matching
 * the exact pattern already proven by Channel Adapters in Phase 1.
 */
import { createClient } from "@/lib/supabase/server";
import { AuthenticationError } from "./errors";
import { AuthenticatedIdentity } from "./identity";

export type { AuthenticatedIdentity, AuthenticationError };

export interface AuthProvider {
  authenticate(): Promise<AuthenticatedIdentity>;
}

export class SupabaseAuthProvider implements AuthProvider {
  async authenticate(): Promise<AuthenticatedIdentity> {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError("No authenticated session found.");
    }
    return { userId: user.id, email: user.email };
  }
}

export const authProvider: AuthProvider = new SupabaseAuthProvider();

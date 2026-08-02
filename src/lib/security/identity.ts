/** Zero imports, deliberately — shared by any file that needs to reference
 * an authenticated identity without pulling in the actual auth provider
 * (and its Supabase dependency) just for a type. */
export interface AuthenticatedIdentity {
  userId: string;
  email?: string;
}

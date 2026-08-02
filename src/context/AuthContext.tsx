"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]       = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabaseRef = useRef<SupabaseClient | null>(null);
  function getSupabase(): SupabaseClient {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  useEffect(() => {
    const supabase = getSupabase();

    // Hydrate session immediately on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // router.refresh() re-fetches server components with the new session cookie.
        // We call it on every auth event so server and client stay in sync.
        router.refresh();
      }
    );

    return () => subscription.unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // deliberately empty — router is stable, supabase client is stable

  const signUp = useCallback(
    async (email: string, password: string, name: string): Promise<{ error: string | null }> => {
      const { error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        },
      });
      return { error: error?.message ?? null };
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      return { error: error?.message ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    // Clear state immediately so UI updates before the redirect
    setUser(null);
    setSession(null);
    await getSupabase().auth.signOut();
    // Use replace to prevent back-button returning to protected page.
    // window.location.href gives a full page reload which guarantees
    // all server components re-render with no session — avoids race
    // conditions between router.push() and router.refresh().
    window.location.href = "/login";
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
      });
      return { error: error?.message ?? null };
    },
    []
  );

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

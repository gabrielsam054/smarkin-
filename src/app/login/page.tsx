"use client";

import { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, ArrowRight, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/layout/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/shared/GoogleButton";
import { ToastContainer, useToast } from "@/components/ui/Toast";

function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";
  const { toasts, showToast, removeToast } = useToast();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await signIn(email, password);
      if (error) { showToast(error, "error"); return; }
      router.replace(redirectTo);
    });
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required disabled={isPending}
          autoComplete="email"
        />
        <div className="relative">
          <Input
            label="Password"
            type={showPw ? "text" : "password"}
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required disabled={isPending}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-8 text-text-muted hover:text-text-secondary transition-colors"
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <div className="flex justify-end">
          <Link href="/auth/forgot-password" className="text-xs text-text-muted hover:text-primary transition-colors">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" size="lg" className="w-full gap-2" loading={isPending}>
          Sign in <ArrowRight size={15} />
        </Button>
      </form>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[45%] relative bg-surface border-r border-border overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />
        <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none" />
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col justify-between p-12 h-full">
          <Logo size="md" />

          <div>
            <h2 className="text-4xl font-black text-text-primary leading-tight mb-4">
              Smarter Decisions.<br />
              <span className="gradient-text">Stronger Results.</span>
            </h2>
            <p className="text-text-secondary text-base leading-relaxed mb-8">
              AI-powered audience insights and campaign strategies that help you grow and succeed.
            </p>
            <div className="flex flex-col gap-2.5">
              {["Audience Intelligence Reports", "Campaign Strategy Engine", "AI Creative Studio", "Meta Ads Targeting"].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <CheckCircle size={14} className="text-primary flex-none" />
                  <span className="text-sm text-text-secondary">{f}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-text-muted">
            Trusted by marketers across Africa and beyond.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo size="sm" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-1">Welcome back</h1>
            <p className="text-text-secondary text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary font-semibold hover:underline">Sign up free</Link>
            </p>
          </div>

          <div className="space-y-4">
            <GoogleButton className="w-full" />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>
          </div>

          <p className="text-center text-xs text-text-muted mt-8">
            By signing in you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

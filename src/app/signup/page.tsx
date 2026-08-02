"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, CheckCircle, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/layout/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GoogleButton } from "@/components/shared/GoogleButton";
import { ToastContainer, useToast } from "@/components/ui/Toast";

export default function SignupPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();

  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [done, setDone]         = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { showToast("Password must be at least 8 characters.", "error"); return; }
    startTransition(async () => {
      const { error } = await signUp(email, password, name);
      if (error) { showToast(error, "error"); return; }
      setDone(true);
    });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={30} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary mb-3">Check your email</h1>
          <p className="text-text-secondary text-sm leading-relaxed mb-6">
            We sent a verification link to <span className="text-text-primary font-semibold">{email}</span>.
          </p>
          <Button variant="ghost" onClick={() => router.push("/login")} className="w-full">
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

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
              Start Growing<br />
              <span className="gradient-text">Your Business.</span>
            </h2>
            <p className="text-text-secondary text-base leading-relaxed mb-8">
              Join thousands of marketers using Smarkin AI to build winning Meta ad campaigns.
            </p>
            <div className="flex flex-col gap-2.5">
              {[
                "Full Audience Intelligence Reports",
                "AI-Powered Campaign Strategy",
                "Meta Ads Targeting Recommendations",
                "No credit card required to start",
              ].map((f) => (
                <div key={f} className="flex items-center gap-2.5">
                  <CheckCircle size={14} className="text-primary flex-none" />
                  <span className="text-sm text-text-secondary">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-text-muted">Growth &amp; Success — Powered by AI</p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Logo size="sm" />
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-text-primary mb-1">Create your account</h1>
            <p className="text-text-secondary text-sm">
              Already have an account?{" "}
              <Link href="/login" className="text-primary font-semibold hover:underline">Sign in</Link>
            </p>
          </div>

          <div className="space-y-4">
            <GoogleButton className="w-full" />

            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-text-muted uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Full name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required disabled={isPending}
                autoComplete="name"
              />
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
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required disabled={isPending}
                  autoComplete="new-password"
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-8 text-text-muted hover:text-text-secondary transition-colors">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Button type="submit" size="lg" className="w-full gap-2" loading={isPending}>
                Create account <ArrowRight size={15} />
              </Button>
            </form>
          </div>

          <p className="text-center text-xs text-text-muted mt-8">
            By signing up you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

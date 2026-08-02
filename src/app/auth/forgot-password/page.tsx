"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Logo } from "@/components/layout/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent]   = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const { error } = await resetPassword(email);
      if (error) { showToast(error, "error"); return; }
      setSent(true);
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 max-w-6xl mx-auto w-full">
        <Logo size="sm" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              {sent ? <CheckCircle size={20} className="text-primary" /> : <Mail size={20} className="text-primary" />}
            </div>
            <h1 className="text-2xl font-heading font-bold text-text-primary mb-2">
              {sent ? "Check your inbox" : "Reset your password"}
            </h1>
            <p className="text-text-secondary text-sm">
              {sent
                ? `We sent a reset link to ${email}`
                : "Enter your email and we'll send you a reset link"}
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-8 shadow-card">
            {sent ? (
              <div className="text-center space-y-4">
                <p className="text-sm text-text-secondary leading-relaxed">
                  If an account exists for{" "}
                  <span className="text-text-primary font-medium">{email}</span>,
                  you&apos;ll receive a password reset link shortly.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setSent(false)}
                  className="w-full"
                >
                  Resend email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="email"
                />
                <Button type="submit" size="lg" className="w-full" loading={isPending}>
                  Send reset link
                </Button>
              </form>
            )}
          </div>

          <div className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft size={14} />
              Back to sign in
            </Link>
          </div>
        </div>
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

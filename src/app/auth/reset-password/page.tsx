"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/layout/Logo";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toasts, showToast, removeToast } = useToast();
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [showPw, setShowPw]       = useState(false);
  const [done, setDone]           = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      showToast("Password must be at least 8 characters.", "error"); return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match.", "error"); return;
    }
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { showToast(error.message, "error"); return; }
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    });
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <CheckCircle size={48} className="text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-heading font-bold text-text-primary mb-2">
            Password updated
          </h1>
          <p className="text-text-secondary text-sm">
            Redirecting to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-6 py-5 max-w-6xl mx-auto w-full">
        <Logo size="sm" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
              <Lock size={20} className="text-primary" />
            </div>
            <h1 className="text-2xl font-heading font-bold text-text-primary mb-2">
              Set new password
            </h1>
            <p className="text-text-secondary text-sm">
              Choose a strong password for your account
            </p>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-8 shadow-card">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Input
                  label="New password"
                  type={showPw ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isPending}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-8 text-text-muted hover:text-text-secondary"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <Input
                label="Confirm password"
                type={showPw ? "text" : "password"}
                placeholder="Repeat password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                disabled={isPending}
                autoComplete="new-password"
              />
              <Button type="submit" size="lg" className="w-full" loading={isPending}>
                Update password
              </Button>
            </form>
          </div>
        </div>
      </main>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </div>
  );
}

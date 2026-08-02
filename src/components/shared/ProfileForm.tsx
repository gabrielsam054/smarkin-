"use client";

import { useState, useTransition, useRef } from "react";
import { Camera, Save } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ToastContainer, useToast } from "@/components/ui/Toast";

const COUNTRIES = [
  { value: "", label: "Select country" },
  { value: "Ghana", label: "🇬🇭 Ghana" },
  { value: "Nigeria", label: "🇳🇬 Nigeria" },
  { value: "Kenya", label: "🇰🇪 Kenya" },
  { value: "South Africa", label: "🇿🇦 South Africa" },
  { value: "United States", label: "🇺🇸 United States" },
  { value: "United Kingdom", label: "🇬🇧 United Kingdom" },
  { value: "Canada", label: "🇨🇦 Canada" },
  { value: "Australia", label: "🇦🇺 Australia" },
  { value: "Other", label: "Other" },
];

interface Profile {
  first_name?: string | null;
  last_name?: string | null;
  company?: string | null;
  job_title?: string | null;
  country?: string | null;
  avatar_url?: string | null;
}

interface ProfileFormProps {
  user: SupabaseUser;
  profile: Profile | null;
}

export function ProfileForm({ user, profile }: ProfileFormProps) {
  const { toasts, showToast, removeToast } = useToast();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [firstName, setFirstName] = useState(profile?.first_name ?? "");
  const [lastName,  setLastName]  = useState(profile?.last_name  ?? "");
  const [company,   setCompany]   = useState(profile?.company    ?? "");
  const [jobTitle,  setJobTitle]  = useState(profile?.job_title  ?? "");
  const [country,   setCountry]   = useState(profile?.country    ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase()
    || user.email?.[0]?.toUpperCase() || "U";

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast("Image must be under 2MB.", "error"); return;
    }
    setUploading(true);
    const supabase = createClient();
    const ext  = file.name.split(".").pop() ?? "jpg";
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });
    if (error) {
      showToast("Upload failed: " + error.message, "error");
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    setAvatarUrl(data.publicUrl + "?t=" + Date.now());
    setUploading(false);
    showToast("Avatar updated.", "success");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase.from("profiles").upsert({
        id:         user.id,
        first_name: firstName || null,
        last_name:  lastName  || null,
        company:    company   || null,
        job_title:  jobTitle  || null,
        country:    country   || null,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString(),
      });
      if (error) { showToast(error.message, "error"); return; }
      showToast("Profile saved successfully.", "success");
    });
  };

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar */}
        <div className="bg-surface border border-border rounded-2xl p-6">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-muted mb-4">
            Profile Photo
          </p>
          <div className="flex items-center gap-5">
            <div className="relative flex-none">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-primary/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center font-heading font-bold text-white text-xl border-2 border-primary/20">
                  {initials}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-surface border-2 border-border flex items-center justify-center hover:border-primary transition-colors"
                title="Change avatar"
              >
                <Camera size={12} className="text-text-secondary" />
              </button>
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">
                {firstName || lastName
                  ? `${firstName} ${lastName}`.trim()
                  : "Your name"}
              </p>
              <p className="text-xs text-text-muted mt-0.5">{user.email}</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="text-xs text-primary hover:underline mt-1.5 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Change photo"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleAvatarUpload}
            />
          </div>
        </div>

        {/* Personal info */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-muted">
            Personal Information
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Jane"
              disabled={isPending}
              autoComplete="given-name"
            />
            <Input
              label="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Smith"
              disabled={isPending}
              autoComplete="family-name"
            />
          </div>
          <Input
            label="Company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Inc."
            disabled={isPending}
            autoComplete="organization"
          />
          <Input
            label="Job title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Marketing Manager"
            disabled={isPending}
            autoComplete="organization-title"
          />
          <Select
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={COUNTRIES}
            disabled={isPending}
          />
        </div>

        {/* Read-only account info */}
        <div className="bg-surface border border-border rounded-2xl p-6 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-text-muted">
            Account Details
          </p>
          {[
            { label: "Email",        value: user.email ?? "—" },
            { label: "Account ID",   value: user.id.slice(0, 8) + "…", mono: true },
            { label: "Member since", value: new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }), mono: true },
            { label: "Auth method",  value: user.app_metadata?.provider === "google" ? "Google OAuth" : "Email / Password" },
          ].map(({ label, value, mono }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <span className="text-sm text-text-secondary">{label}</span>
              <span className={`text-sm text-text-primary ${mono ? "font-mono text-xs" : "font-medium"}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        <Button type="submit" size="lg" className="w-full gap-2" loading={isPending}>
          <Save size={16} />
          Save changes
        </Button>
      </form>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}

// ── Navigation ──────────────────────────────────────────────────────────────
export interface NavItem {
  label: string;
  href: string;
  external?: boolean;
}

// ── Feature ──────────────────────────────────────────────────────────────────
export interface Feature {
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

// ── Pricing ──────────────────────────────────────────────────────────────────
export interface PricingTier {
  id: string;
  name: string;
  price: number | "Free";
  cycle?: string;
  description: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  badge?: string;
}

// ── Testimonial ──────────────────────────────────────────────────────────────
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  avatar?: string;
}

// ── How It Works step ─────────────────────────────────────────────────────────
export interface HowItWorksStep {
  step: number;
  title: string;
  description: string;
  icon: string;
}

// ── User (placeholder for Auth) ───────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  plan: "free" | "pro";
  createdAt: string;
}

// ── Contact form ──────────────────────────────────────────────────────────────
export interface ContactFormData {
  name: string;
  email: string;
  message: string;
}

// ── Auth form ─────────────────────────────────────────────────────────────────
export interface LoginFormData {
  email: string;
  password: string;
}

export interface SignUpFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

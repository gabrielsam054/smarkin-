import type { NavItem, Feature, PricingTier, Testimonial, HowItWorksStep } from "@/types";

export const SITE = {
  name: "Smarkin AI",
  tagline: "Audience Intelligence Engine",
  description:
    "Generate audience intelligence reports powered by AI and your proprietary marketing knowledge engine.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://smarkin.ai",
  twitter: "@smarkinai",
} as const;

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const FEATURES: Feature[] = [
  {
    icon: "🧠",
    title: "AI Audience Analysis",
    description:
      "23-step reasoning process that analyzes your product before recommending any audience. No guessing.",
    badge: "Core",
  },
  {
    icon: "👥",
    title: "Customer Personas",
    description:
      "Ranked personas matched to your product from a proprietary persona knowledge database.",
  },
  {
    icon: "🎯",
    title: "Audience Builder",
    description:
      "Primary, secondary, and expansion interest sets — verified against the real Meta interest database.",
  },
  {
    icon: "📊",
    title: "Campaign Strategy",
    description:
      "Audience strategy, campaign objective, funnel mapping, and retargeting plan in every report.",
  },
  {
    icon: "🎨",
    title: "Creative Recommendations",
    description:
      "Ad format, creative angle, proven hooks, and call-to-action copy tailored to your audience.",
  },
  {
    icon: "📈",
    title: "Optimization Tips",
    description:
      "Actionable optimization recommendations grounded in your performance rules database.",
  },
  {
    icon: "📄",
    title: "PDF Reports",
    description:
      "Export any intelligence report as a clean, print-ready PDF to share with your team or clients.",
    badge: "Pro",
  },
  {
    icon: "💾",
    title: "Saved Reports",
    description:
      "Save up to 25 reports and reopen them instantly — no need to re-run the analysis.",
    badge: "Pro",
  },
];

export const HOW_IT_WORKS: HowItWorksStep[] = [
  {
    step: 1,
    icon: "✍️",
    title: "Describe Your Product",
    description:
      "Tell Smarkin AI what you sell, who it's for, and where you sell it. The more detail, the better.",
  },
  {
    step: 2,
    icon: "🔍",
    title: "AI Analyzes Your Business",
    description:
      "The 23-step reasoning engine cross-references your product against the full knowledge database.",
  },
  {
    step: 3,
    icon: "🎯",
    title: "Receive Your Intelligence Report",
    description:
      "A complete audience intelligence report — personas, interests, strategy, creative, and confidence scores.",
  },
  {
    step: 4,
    icon: "🚀",
    title: "Launch Better Campaigns",
    description:
      "Use your report to launch Meta campaigns with verified audiences and data-backed strategy.",
  },
];

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free Trial",
    price: "Free",
    description: "Get started and see the power of AI audience intelligence.",
    features: [
      "3 Audience Intelligence Reports",
      "Customer Personas",
      "Meta Interest Recommendations",
      "Campaign Strategy",
      "AI Decision Log",
      "Confidence Scoring",
    ],
    cta: "Start Free",
  },
  {
    id: "pro",
    name: "Pro",
    price: 9.99,
    cycle: "month",
    description: "Everything you need to run intelligent Meta campaigns at scale.",
    features: [
      "Unlimited Reports",
      "Full Audience Intelligence",
      "Customer Personas",
      "Campaign Strategy",
      "Creative Recommendations",
      "Optimization Tips",
      "PDF Export",
      "Saved Reports",
      "Future Updates",
      "Priority Support",
    ],
    cta: "Start Free Trial",
    highlighted: true,
    badge: "Most Popular",
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Sarah Mensah",
    role: "Media Buyer",
    company: "Growth Labs",
    content:
      "Smarkin AI completely changed how I approach Meta campaigns. The audience intelligence is unlike anything else I've used.",
  },
  {
    id: "2",
    name: "Kwame Asante",
    role: "Performance Marketer",
    company: "Scale Digital",
    content:
      "The 23-step AI reasoning gives me confidence that every interest I target is backed by real analysis, not guesswork.",
  },
  {
    id: "3",
    name: "Amira Hassan",
    role: "Founder",
    company: "Spark Agency",
    content:
      "My clients love getting a full intelligence report. The PDF export feature alone is worth the subscription.",
  },
];

export const TRUSTED_COMPANIES = [
  "Growth Labs",
  "Scale Digital",
  "Spark Agency",
  "Meta Pros",
  "AdVault",
  "Propel Media",
];

export const FOOTER_LINKS = {
  product: [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "Roadmap", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  company: [
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Cookie Policy", href: "#" },
  ],
} as const;

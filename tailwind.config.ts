import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // Strong custom easing curves (per Emil Kowalski's design-eng
      // skill: "The built-in CSS easings are too weak. They lack the
      // punch that makes animations feel intentional.") — replaces
      // Tailwind's default ease-out (cubic-bezier(0,0,0.2,1), one of
      // the weak built-ins) with a genuinely stronger curve for UI
      // interactions, plus one for on-screen movement/morphing.
      transitionTimingFunction: {
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      colors: {
        // ── New token-based system, namespaced with t- to guarantee zero
        //    collision with the existing hardcoded classes below, which
        //    every current page still uses unchanged. New components use
        //    the t- prefixed classes; nothing existing needs to change.
        "t-background":       "rgb(var(--background) / <alpha-value>)",
        "t-surface":          "rgb(var(--surface) / <alpha-value>)",
        "t-surface-2":        "rgb(var(--surface-2) / <alpha-value>)",
        "t-surface-3":        "rgb(var(--surface-3) / <alpha-value>)",
        "t-primary":          "rgb(var(--primary) / <alpha-value>)",
        "t-primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",
        "t-primary-dim":      "rgb(var(--primary-dim) / <alpha-value>)",
        "t-secondary":        "rgb(var(--secondary) / <alpha-value>)",
        "t-amber":            "rgb(var(--amber) / <alpha-value>)",
        "t-destructive":      "rgb(var(--destructive) / <alpha-value>)",
        "t-text-primary":     "rgb(var(--text-primary) / <alpha-value>)",
        "t-text-secondary":   "rgb(var(--text-secondary) / <alpha-value>)",
        "t-text-muted":       "rgb(var(--text-muted) / <alpha-value>)",
        "t-border":           "rgb(var(--border))",
        "t-border-strong":    "rgb(var(--border-strong))",

        // ── Existing hardcoded system — now re-themed light + purple,
        //    per explicit direction. Every page using these semantic
        //    class names (bg-background, text-primary, border-border,
        //    etc.) picks up the new theme automatically; only components
        //    with literal inline hex values needed separate updates. ────
        // ── Core backgrounds ──────────────────────────────────
        background: "#F8FAFC",   // light slate — page background
        surface:    "#FFFFFF",   // white card backgrounds
        "surface-2":"#F1F5F9",   // elevated surfaces / subtle fills
        "surface-3":"#E2E8F0",   // hover/active states

        // ── Smarkin Purple — primary brand ────────────────────
        primary: {
          DEFAULT:    "#7C3AED",
          foreground: "#FFFFFF",
          dim:        "#6D28D9",
          light:      "#A78BFA",
          glow:       "rgba(124,58,237,0.18)",
        },

        // ── Secondary / accent ────────────────────────────────
        secondary: {
          DEFAULT:    "#3B82F6",
          foreground: "#fff",
          dim:        "#2563EB",
        },

        // ── Semantic ──────────────────────────────────────────
        amber:       "#D97706",
        destructive: { DEFAULT: "#DC2626", foreground: "#fff" },

        // ── Text ─────────────────────────────────────────────
        text: {
          primary:   "#0F172A",
          secondary: "#475569",
          muted:     "#94A3B8",
        },

        // ── Borders ───────────────────────────────────────────
        border:          "#E2E8F0",
        "border-strong": "#CBD5E1",
        "border-green":  "rgba(124,58,237,0.25)",
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
        // The one real typographic risk, per the frontend-design skill's
        // "spend boldness in one place" guidance — a genuinely
        // characterful serif reserved for the numbers that matter most
        // (health scores, key stats, confidence), never body text. Not
        // decoration: it makes the Constitution's own Evidence-First
        // Rule (facts vs. interpretation) visually legible, not just
        // structurally true.
        display: ["Fraunces", "Georgia", "serif"],
      },

      borderRadius: {
        sm: "6px", md: "10px", lg: "14px",
        xl: "18px", "2xl": "24px", "3xl": "32px", full: "9999px",
      },

      boxShadow: {
        card:        "0 1px 2px rgba(15,23,42,0.04), 0 1px 3px rgba(15,23,42,0.08)",
        "card-hover":"0 2px 4px rgba(15,23,42,0.06), 0 8px 20px rgba(15,23,42,0.10)",
        green:       "0 0 0 1px rgba(124,58,237,0.20), 0 0 32px rgba(124,58,237,0.12)",
        "green-btn": "0 4px 16px rgba(124,58,237,0.30), 0 1px 3px rgba(15,23,42,0.10)",
        focus:       "0 0 0 3px rgba(124,58,237,0.18)",
      },

      backgroundImage: {
        "hero-gradient":  "radial-gradient(ellipse 100% 80% at 50% -5%, rgba(124,58,237,0.14) 0%, rgba(59,130,246,0.05) 45%, transparent 70%)",
        "card-shine":     "linear-gradient(135deg, rgba(15,23,42,0.015) 0%, rgba(15,23,42,0) 100%)",
        "brand-gradient": "linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)",
        "dot-grid":       "radial-gradient(circle, rgba(15,23,42,0.05) 1px, transparent 1px)",
      },
      backgroundSize: { "dot-grid": "28px 28px" },

      animation: {
        "fade-up":  "fadeUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "fade-in":  "fadeIn 0.3s ease forwards",
        "pulse-slow":"pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeUp: { "0%": { opacity:"0", transform:"translateY(14px)" }, "100%": { opacity:"1", transform:"translateY(0)" } },
        fadeIn: { "0%": { opacity:"0" }, "100%": { opacity:"1" } },
      },
    },
  },
  plugins: [animate],
};
export default config;

import type { Metadata, Viewport } from "next";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/providers/ThemeProvider";
import "@/styles/globals.css";
import { SITE } from "@/lib/constants";

export const metadata: Metadata = {
  title: { default: `${SITE.name} — ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { themeColor: "#F8FAFC" };

// Runs before hydration so the new token-based system (t- prefixed classes)
// never flashes light-then-dark on first paint. Existing hardcoded-hex
// elements are unaffected either way — this only resolves .dark/.light on
// <html>, which only the new token variables read.
const ANTI_FLASH_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem("smarkin-theme");
    var theme = stored === "light" || stored === "dark" ? stored
      : stored === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : "dark";
    document.documentElement.classList.add(theme);
  } catch (e) {
    document.documentElement.classList.add("dark");
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH_SCRIPT }} />
      </head>
      <body className="bg-background text-text-primary antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

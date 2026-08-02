import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { Logo } from "@/components/layout/Logo";
import type { ReactNode } from "react";
import {
  LayoutDashboard, Users, CreditCard, Settings, Shield,
  FileText, Palette, Brain, BarChart2, Terminal,
  Flag, Image, Search, Plug, Activity, Bell,
  BookOpen, Zap, LogOut
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin",              icon: LayoutDashboard, label: "Dashboard"       },
      { href: "/admin/analytics",    icon: BarChart2,       label: "Analytics"       },
      { href: "/admin/notifications",icon: Bell,            label: "Notifications"   },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/content",      icon: FileText,        label: "Pages"           },
      { href: "/admin/blog",         icon: BookOpen,        label: "Blog"            },
      { href: "/admin/media",        icon: Image,           label: "Media Library"   },
      { href: "/admin/seo",          icon: Search,          label: "SEO Center"      },
    ],
  },
  {
    label: "Platform",
    items: [
      { href: "/admin/design",       icon: Palette,         label: "Design Studio"   },
      { href: "/admin/intelligence", icon: Brain,           label: "AI Intelligence" },
      { href: "/admin/prompts",      icon: Terminal,        label: "Prompt Manager"  },
      { href: "/admin/flags",        icon: Flag,            label: "Feature Flags"   },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/admin/users",        icon: Users,           label: "Users"           },
      { href: "/admin/billing",      icon: CreditCard,      label: "Billing"         },
      { href: "/admin/api",          icon: Plug,            label: "API Center"      },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/logs",         icon: Zap,             label: "AI Logs"         },
      { href: "/admin/system",       icon: Activity,        label: "System Monitor"  },
      { href: "/admin/settings",     icon: Settings,        label: "Settings"        },
    ],
  },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-[220px] min-h-screen bg-surface border-r border-border flex-none sticky top-0 h-screen overflow-y-auto">
        {/* Logo */}
        <div className="px-5 pt-5 pb-4 border-b border-border flex-none">
          <Logo size="sm" />
          <div className="mt-2.5 flex items-center gap-1.5">
            <Shield size={10} className="text-primary flex-none" />
            <span className="font-mono text-[9px] uppercase tracking-[2px] text-primary font-bold">Control Center</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-2 mb-1.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider">{section.label}</p>
              <div className="space-y-0.5">
                {section.items.map(({ href, icon: Icon, label }) => (
                  <Link key={href} href={href}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[12px] font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-all group">
                    <Icon size={13} className="flex-none text-text-muted group-hover:text-primary transition-colors" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-border flex-none">
          <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-surface-2 border border-border mb-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-none">
              <Shield size={11} className="text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-text-primary truncate">Admin</p>
              <p className="text-[10px] text-text-muted truncate">{admin?.email?.split("@")[0]}</p>
            </div>
          </div>
          <Link href="/dashboard"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] text-text-muted hover:text-text-primary transition-colors">
            <LogOut size={11} /> Back to App
          </Link>
        </div>
      </aside>

      {/* Mobile admin top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-surface border-b border-border h-14 flex items-center px-4">
        <span className="font-mono text-[11px] uppercase tracking-widest text-primary font-bold">⚙ Control Center</span>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto pt-14 lg:pt-0">
        {children}
      </main>
    </div>
  );
}

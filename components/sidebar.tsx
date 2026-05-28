"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  GraduationCap,
  Zap,
  Users,
  BarChart3,
  ChevronDown,
  Send
} from "lucide-react";

type NavLink = { href: string; label: string };
type NavItem =
  | { type: "link"; href: string; label: string; icon: typeof LayoutDashboard }
  | { type: "group"; id: string; label: string; icon: typeof LayoutDashboard; children: NavLink[] };

const items: NavItem[] = [
  { type: "link", href: "/", label: "Início", icon: LayoutDashboard },
  {
    type: "group",
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    children: [
      { href: "/dashboard/vendas", label: "Vendas" },
      { href: "/dashboard/alunos", label: "Alunos" }
    ]
  },
  { type: "link", href: "/trafego", label: "Tráfego pago", icon: TrendingUp },
  { type: "link", href: "/concorrentes", label: "Concorrentes", icon: Users },
  { type: "link", href: "/alunos", label: "Alunos", icon: GraduationCap },
  { type: "link", href: "/automacoes", label: "Automações", icon: Zap },
  { type: "link", href: "/whatsapp", label: "WhatsApp", icon: Send }
];

export function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (pathname.startsWith("/dashboard")) s.add("dashboard");
    return s;
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col border-r border-brand-800 bg-brand-950">
      <div className="flex flex-col gap-2 px-6 py-4 border-b border-brand-800">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Dani Rosa"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-brand-600"
          />
          <span className="font-semibold text-ink-50 tracking-tight">Dani Rosa</span>
        </div>
        <p className="font-handwritten text-accent-gold/90 text-lg leading-tight -rotate-1 pl-1">
          O lado sexy dos vegetais
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          if (item.type === "link") {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-800 text-accent-gold"
                    : "text-ink-200 hover:bg-brand-900 hover:text-ink-50"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          }

          const Icon = item.icon;
          const isOpen = openGroups.has(item.id);
          const inGroup = pathname.startsWith(`/${item.id}`);

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleGroup(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  inGroup
                    ? "text-accent-gold"
                    : "text-ink-200 hover:bg-brand-900 hover:text-ink-50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
              {isOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-brand-800 pl-3">
                  {item.children.map((child) => {
                    const childActive = pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-md px-3 py-2 text-xs font-medium transition-colors",
                          childActive
                            ? "bg-brand-800 text-accent-gold"
                            : "text-ink-200 hover:bg-brand-900 hover:text-ink-50"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-brand-800 p-4">
        <p className="text-xs text-ink-300">v0.1 · painel interno</p>
      </div>
    </aside>
  );
}

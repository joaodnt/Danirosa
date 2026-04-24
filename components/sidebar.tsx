"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, TrendingUp, GraduationCap, Zap, Users, BookOpen } from "lucide-react";

const items = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/membros", label: "Área de membros", icon: BookOpen },
  { href: "/trafego", label: "Tráfego pago", icon: TrendingUp },
  { href: "/concorrentes", label: "Concorrentes", icon: Users },
  { href: "/alunos", label: "Alunos", icon: GraduationCap },
  { href: "/automacoes", label: "Automações", icon: Zap }
];

export function Sidebar() {
  const pathname = usePathname();

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
        })}
      </nav>

      <div className="border-t border-brand-800 p-4">
        <p className="text-xs text-ink-300">v0.1 · painel interno</p>
      </div>
    </aside>
  );
}

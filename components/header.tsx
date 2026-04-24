import { LogOut, User } from "lucide-react";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function Header({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-brand-800 bg-brand-950/80 backdrop-blur px-6 lg:px-8">
      <div>
        <h2 className="text-xs text-ink-300 uppercase tracking-wider">{greeting()},</h2>
        <p className="text-sm font-medium text-ink-50">{name}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-800 ring-1 ring-brand-700">
          <User className="h-4 w-4 text-ink-200" />
        </div>
        <form action="/auth/logout" method="post">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-200 hover:bg-brand-800 hover:text-ink-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}

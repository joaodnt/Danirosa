import { cn } from "@/lib/utils";

type Source = "Meta" | "Hotmart";

type Props = {
  label: string;
  value: string;
  source?: Source;
  sub?: string;
  variant?: "default" | "highlight";
  className?: string;
  children?: React.ReactNode;
};

const sourceClass: Record<Source, string> = {
  Meta: "bg-brand-800/60 text-accent-terracotta",
  Hotmart: "bg-brand-700/40 text-brand-100"
};

export function StatCard({
  label,
  value,
  source,
  sub,
  variant = "default",
  className,
  children
}: Props) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 ring-1 transition-colors",
        variant === "highlight"
          ? "bg-gradient-to-br from-brand-700/60 to-brand-900 ring-accent-gold/40 p-6"
          : "bg-brand-900 ring-brand-800",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[10px] uppercase tracking-wider",
          variant === "highlight" ? "text-accent-gold" : "text-ink-300"
        )}
      >
        <span>{label}</span>
        {source && (
          <span className={cn("text-[9px] rounded px-1.5 py-0.5", sourceClass[source])}>
            {source}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-2 font-semibold tabular-nums",
          variant === "highlight"
            ? "text-[2.25rem] leading-none text-ink-50"
            : "text-2xl text-ink-50"
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-ink-300">{sub}</div>}
      {children}
    </div>
  );
}

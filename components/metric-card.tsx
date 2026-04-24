import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  label: string;
  value: string;
  delta?: number;
  icon?: LucideIcon;
  accent?: "brand" | "gold" | "terracotta" | "sage";
};

const accentMap = {
  brand: "bg-brand-700/30 text-brand-200 ring-1 ring-brand-700",
  gold: "bg-accent-gold/15 text-accent-gold ring-1 ring-accent-gold/30",
  terracotta: "bg-accent-terracotta/15 text-accent-terracotta ring-1 ring-accent-terracotta/30",
  sage: "bg-brand-400/15 text-brand-200 ring-1 ring-brand-400/30"
};

export function MetricCard({ label, value, delta, icon: Icon, accent = "brand" }: Props) {
  const positive = (delta ?? 0) >= 0;
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-ink-300">{label}</p>
            <p className="mt-2 text-2xl font-semibold text-ink-50">{value}</p>
          </div>
          {Icon && (
            <div className={cn("rounded-lg p-2.5", accentMap[accent])}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
        {delta !== undefined && (
          <div className="mt-4 flex items-center gap-1 text-sm">
            {positive ? (
              <TrendingUp className="h-4 w-4 text-brand-300" />
            ) : (
              <TrendingDown className="h-4 w-4 text-accent-terracotta" />
            )}
            <span
              className={cn(
                "font-medium",
                positive ? "text-brand-200" : "text-accent-terracotta"
              )}
            >
              {positive ? "+" : ""}
              {delta.toFixed(1)}%
            </span>
            <span className="text-ink-300">vs. período anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

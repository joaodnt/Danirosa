// MOCKUP — Tráfego Meta Ads preview.
import { formatCurrency } from "@/lib/utils";
import { AdCard, type AdCardData } from "./ad-card";
import { TrendingUp, Target } from "lucide-react";

type BucketKey = "perpetuo" | "lancamento";

const meta: Record<BucketKey, { label: string; sub: string; icon: typeof TrendingUp; accent: string }> = {
  perpetuo: {
    label: "Perpétuo (vendas)",
    sub: "Campanhas otimizadas para compras",
    icon: TrendingUp,
    accent: "text-emerald-400"
  },
  lancamento: {
    label: "Lançamento (leads)",
    sub: "Campanhas otimizadas para captação",
    icon: Target,
    accent: "text-accent-gold"
  }
};

export function BucketSection({
  bucket,
  ads,
  totalSpend,
  totalResults,
  avgCostPerResult
}: {
  bucket: BucketKey;
  ads: AdCardData[];
  totalSpend: number;
  totalResults: number;
  avgCostPerResult: number;
}) {
  const m = meta[bucket];
  const Icon = m.icon;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-brand-900 ring-1 ring-brand-800">
            <Icon className={`h-5 w-5 ${m.accent}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-50">{m.label}</h2>
            <p className="text-xs text-ink-300">{m.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <Summary label="Investido" value={formatCurrency(totalSpend)} />
          <Summary
            label={bucket === "perpetuo" ? "Compras" : "Leads"}
            value={totalResults.toLocaleString("pt-BR")}
          />
          <Summary label="Custo médio" value={formatCurrency(avgCostPerResult)} highlight />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ads.map((ad, i) => (
          <AdCard key={ad.id} ad={ad} rank={i + 1} />
        ))}
      </div>
    </section>
  );
}

function Summary({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span className="text-[10px] uppercase tracking-wider text-ink-300">{label}</span>
      <span
        className={`text-sm font-semibold tabular-nums ${
          highlight ? "text-accent-gold" : "text-ink-50"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

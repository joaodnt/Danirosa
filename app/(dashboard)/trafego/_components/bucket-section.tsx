import { formatCurrency } from "@/lib/utils";
import { AdCard } from "./ad-card";
import { TrendingUp, Target, Layers } from "lucide-react";
import type { BucketSummary } from "@/lib/integrations/meta-ads";

const meta = {
  perpetuo: {
    label: "Perpétuo (vendas)",
    sub: "Campanhas otimizadas para compras",
    icon: TrendingUp,
    accent: "text-emerald-400",
    resultLabel: "Compras" as const
  },
  lancamento: {
    label: "Lançamento (leads)",
    sub: "Campanhas otimizadas para captação",
    icon: Target,
    accent: "text-accent-gold",
    resultLabel: "Leads" as const
  },
  outros: {
    label: "Outros",
    sub: "Campanhas de tráfego, alcance ou engajamento",
    icon: Layers,
    accent: "text-ink-300",
    resultLabel: "Cliques" as const
  }
};

export function BucketSection({
  summary,
  accountId
}: {
  summary: BucketSummary;
  accountId?: string;
}) {
  const m = meta[summary.bucket];
  const Icon = m.icon;
  const hasAds = summary.ads.length > 0;

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
          <Summary label="Investido" value={formatCurrency(summary.totalSpend)} />
          <Summary
            label={m.resultLabel}
            value={summary.totalResults.toLocaleString("pt-BR")}
          />
          <Summary
            label="Custo médio"
            value={
              summary.avgCostPerResult > 0
                ? formatCurrency(summary.avgCostPerResult)
                : "—"
            }
            highlight
          />
        </div>
      </div>

      {hasAds ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summary.ads.map((ad, i) => {
            const resultCount =
              summary.bucket === "perpetuo" ? ad.purchases : ad.leads;
            const costPerResult =
              summary.bucket === "perpetuo" ? ad.costPerPurchase : ad.costPerLead;
            const adsManagerUrl = accountId
              ? `https://business.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_ids=${ad.id}`
              : undefined;
            return (
              <AdCard
                key={ad.id}
                ad={ad}
                rank={i + 1}
                resultLabel={m.resultLabel === "Compras" ? "Compras" : "Leads"}
                resultCount={resultCount}
                costPerResult={costPerResult}
                adsManagerUrl={adsManagerUrl}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-brand-800 bg-brand-900/30 p-8 text-center">
          <p className="text-sm text-ink-300">
            Nenhum anúncio neste período
          </p>
        </div>
      )}
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

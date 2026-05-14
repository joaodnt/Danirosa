import { StatCard } from "@/components/stat-card";
import { getVendasMetrics } from "@/lib/dashboard/vendas";
import { parsePeriod, formatRange } from "@/lib/dashboard/period";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 300;

export default async function VendasPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const m = await getVendasMetrics(period);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-50">Vendas</h1>
        <p className="text-xs text-ink-300 mt-1">{formatRange(period)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Resultado" value={formatCurrency(m.resultado)} source="Hotmart" />
        <StatCard label="Investimento (Ads)" value={formatCurrency(m.investimento)} source="Meta" />
        <StatCard label="ROAS" value={`${m.roas.toFixed(2)}×`} sub="Resultado ÷ Investimento" />
        <StatCard label="CPM" value={formatCurrency(m.cpm)} source="Meta" sub="Custo por mil impressões" />
        <StatCard label="CPA" value={formatCurrency(m.cpa)} sub="Investimento ÷ # vendas" />
        <StatCard
          label="Imposto"
          value={formatCurrency(m.imposto)}
          sub={`${m.impostoPct.toFixed(1)}% do Resultado`}
        />
      </div>

      <StatCard label="Lucro Real" value={formatCurrency(m.lucroReal)} variant="highlight">
        <div className="mt-4 pt-4 border-t border-accent-gold/20 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-200">
          <span>
            Resultado <b className="text-ink-50 font-medium">{formatCurrency(m.resultado)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Investimento{" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.investimento)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Imposto ({m.impostoPct.toFixed(1)}%){" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.imposto)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Plataforma ({m.platPct.toFixed(1)}%){" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.plataforma)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Custos manuais{" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.custosManuais)}</b>
          </span>
        </div>
      </StatCard>
    </div>
  );
}

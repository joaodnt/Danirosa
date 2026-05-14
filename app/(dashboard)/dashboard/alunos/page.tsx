import { StatCard } from "@/components/stat-card";
import { DistributionDonut } from "@/components/distribution-donut";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { getAlunosMetrics } from "@/lib/dashboard/alunos";
import { parsePeriod, formatRange } from "@/lib/dashboard/period";
import { formatNumber } from "@/lib/utils";

export const revalidate = 300;

export default async function AlunosPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const m = await getAlunosMetrics(period);

  const totalAtivos = m.distribuicao.reduce((s, d) => s + d.alunos, 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-50">Alunos</h1>
        <p className="text-xs text-ink-300 mt-1">{formatRange(period)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Alunos ativos" value={formatNumber(m.ativos)} sub="status = active" />
        <StatCard label="Novos no período" value={`+${formatNumber(m.novos)}`} sub="matrículas no intervalo" />
        <StatCard
          label="Progressão média"
          value={`${m.progressaoMedia.toFixed(1)}%`}
          sub="na aula em que estão"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          label="Taxa de conclusão"
          value={`${m.taxaConclusao.toFixed(0)}%`}
          sub="completaram ao menos 1 curso"
        />
        <StatCard
          label="Churn / inativos"
          value={formatNumber(m.churn)}
          sub="sem atividade há 30+ dias"
        />
        <StatCard
          label="Tempo até 1ª aula"
          value={`${m.tempoPrimeiraAula.toFixed(1)} dias`}
          sub="média dos novos do período"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div className="rounded-lg ring-1 ring-brand-800 bg-brand-900 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-50">Distribuição por curso</h2>
            <span className="text-[10px] text-ink-300">{formatNumber(totalAtivos)} alunos</span>
          </div>
          <DistributionDonut data={m.distribuicao} />
        </div>

        <div className="rounded-lg ring-1 ring-brand-800 bg-brand-900 p-5">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-sm font-medium text-ink-50">Atividade — últimos 30 dias</h2>
            <span className="text-[10px] text-ink-300">lessons + completions</span>
          </div>
          <ActivityHeatmap data={m.heatmap} />
        </div>
      </div>
    </div>
  );
}

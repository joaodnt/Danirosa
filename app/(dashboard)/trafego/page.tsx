import { MetricCard } from "@/components/metric-card";
import { Handwritten } from "@/components/handwritten";
import { TrafficChart } from "./traffic-chart";
import { fetchMetaAdsMetrics } from "@/lib/integrations/meta-ads";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, MousePointerClick, Eye, Target } from "lucide-react";

export const revalidate = 3600;

export default async function TrafegoPage() {
  const until = new Date().toISOString().split("T")[0];
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  const metrics = await fetchMetaAdsMetrics(since, until);
  const cpc = metrics.clicks > 0 ? metrics.spend / metrics.clicks : 0;
  const ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Tráfego pago</h1>
          <p className="text-sm text-ink-300">Métricas consolidadas dos últimos 30 dias</p>
        </div>
        <Handwritten size="md" align="right" className="max-w-md">
          O vegano que todo mundo gosta. Até os carnívoros.
        </Handwritten>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Investimento"
          value={formatCurrency(metrics.spend)}
          icon={DollarSign}
          accent="terracotta"
        />
        <MetricCard
          label="Impressões"
          value={formatNumber(metrics.impressions)}
          icon={Eye}
          accent="sage"
        />
        <MetricCard
          label="Cliques"
          value={formatNumber(metrics.clicks)}
          icon={MousePointerClick}
          accent="gold"
        />
        <MetricCard
          label="Conversões"
          value={formatNumber(metrics.conversions)}
          icon={Target}
          accent="brand"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>CPC médio</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-ink-50">{formatCurrency(cpc)}</p>
            <p className="text-sm text-ink-300 mt-1">Custo por clique</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>CTR</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-ink-50">{ctr.toFixed(2)}%</p>
            <p className="text-sm text-ink-300 mt-1">Cliques ÷ impressões</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>ROAS</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-ink-50">
              {metrics.roas.toFixed(2)}x
            </p>
            <p className="text-sm text-ink-300 mt-1">Receita ÷ investimento</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Evolução diária</CardTitle>
        </CardHeader>
        <CardContent>
          <TrafficChart />
        </CardContent>
      </Card>
    </div>
  );
}

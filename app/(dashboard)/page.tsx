import { DailyQuote } from "@/components/daily-quote";
import { MetricCard } from "@/components/metric-card";
import { Handwritten } from "@/components/handwritten";
import { fetchMetaAdsMetrics } from "@/lib/integrations/meta-ads";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { DollarSign, TrendingUp, Users, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getProfile, firstName } from "@/lib/profile";

export const revalidate = 3600;

function last30Days() {
  const until = new Date();
  const since = new Date();
  since.setDate(since.getDate() - 30);
  return {
    since: since.toISOString().split("T")[0],
    until: until.toISOString().split("T")[0]
  };
}

export default async function HomePage() {
  const { since, until } = last30Days();
  const [metrics, studentsCount, profile] = await Promise.all([
    fetchMetaAdsMetrics(since, until),
    getStudentsCount(),
    getProfile()
  ]);

  const profit = metrics.revenue - metrics.spend;
  const name = profile ? firstName(profile.name) : "";

  return (
    <div className="flex flex-col gap-6">
      <DailyQuote name={name} />

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-lg font-semibold text-ink-50">
            {name ? `Olá, ${name} ·` : ""} Visão geral
          </h1>
          <p className="text-sm text-ink-300">Últimos 30 dias</p>
        </div>
        <Handwritten size="md" align="right" className="max-w-md">
          Comer é um gesto íntimo, quase secreto
        </Handwritten>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Vendas"
          value={formatCurrency(metrics.revenue)}
          delta={12.4}
          icon={DollarSign}
          accent="gold"
        />
        <MetricCard
          label="Investimento"
          value={formatCurrency(metrics.spend)}
          delta={-3.2}
          icon={Zap}
          accent="terracotta"
        />
        <MetricCard
          label="Lucro (Vendas − Investimento)"
          value={formatCurrency(profit)}
          delta={18.7}
          icon={TrendingUp}
          accent="brand"
        />
        <MetricCard
          label="ROAS"
          value={metrics.roas.toFixed(2) + "x"}
          delta={4.1}
          icon={TrendingUp}
          accent="sage"
        />
      </div>

      <div className="flex items-center justify-center py-2">
        <Handwritten size="lg" align="center" className="text-accent-gold/70">
          O prato é altar, e comer... comer é sagrado
        </Handwritten>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Alunos ativos"
          value={formatNumber(studentsCount)}
          icon={Users}
          accent="brand"
        />
        <MetricCard
          label="Impressões"
          value={formatNumber(metrics.impressions)}
          icon={TrendingUp}
          accent="sage"
        />
        <MetricCard
          label="Cliques"
          value={formatNumber(metrics.clicks)}
          icon={TrendingUp}
          accent="gold"
        />
        <MetricCard
          label="Conversões"
          value={formatNumber(metrics.conversions)}
          icon={TrendingUp}
          accent="terracotta"
        />
      </div>
    </div>
  );
}

async function getStudentsCount(): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");
    return count ?? 0;
  } catch {
    return 0;
  }
}

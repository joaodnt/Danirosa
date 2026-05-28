import { MetricCard } from "@/components/metric-card";
import { TrafficChart } from "./traffic-chart";
import { BucketSection } from "./_components/bucket-section";
import { RefreshButton } from "./_components/refresh-button";
import { PeriodSelector } from "@/components/period-selector";
import { fetchTrafegoData } from "@/lib/integrations/meta-ads";
import { parsePeriod } from "@/lib/dashboard/period";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  MousePointerClick,
  Eye,
  Target,
  TrendingUp,
  ScanLine,
  Percent,
  CircleDollarSign,
  AlertTriangle
} from "lucide-react";

export const revalidate = 3600;

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min === 1) return "há 1 min";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return h === 1 ? "há 1 hora" : `há ${h} horas`;
}

export default async function TrafegoPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const period = parsePeriod(sp);
  const accountId = process.env.META_AD_ACCOUNT_ID;

  const data = await fetchTrafegoData({
    since: period.from,
    until: period.until,
    token: process.env.META_ACCESS_TOKEN,
    accountId
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Tráfego pago</h1>
          <p className="text-sm text-ink-300">
            {data.source === "meta" ? (
              <>
                Conectado a{" "}
                <code className="text-accent-gold font-mono">act_{accountId}</code> ·
                última atualização {timeAgo(data.fetchedAt)}
              </>
            ) : (
              <>Modo demonstração — configure sua conta da Meta</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector />
          <RefreshButton />
        </div>
      </div>

      {data.source === "mock" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-ink-50">Dados de exemplo</p>
            <p className="text-ink-300 mt-1">
              {data.errors.length > 0
                ? `Erro ao conectar com a Meta (${data.errors[0].code}): ${data.errors[0].message}`
                : "Configure META_ACCESS_TOKEN e META_AD_ACCOUNT_ID no .env."}{" "}
              Veja{" "}
              <code className="text-accent-gold">docs/META_SETUP.md</code> para o passo a passo.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Investido"
          value={formatCurrency(data.aggregate.spend)}
          icon={DollarSign}
          accent="terracotta"
        />
        <MetricCard
          label="Impressões"
          value={formatNumber(data.aggregate.impressions)}
          icon={Eye}
          accent="sage"
        />
        <MetricCard
          label="Cliques"
          value={formatNumber(data.aggregate.clicks)}
          icon={MousePointerClick}
          accent="gold"
        />
        <MetricCard
          label="Conversões"
          value={formatNumber(data.aggregate.conversions)}
          icon={Target}
          accent="brand"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MicroCard
          icon={ScanLine}
          label="CPM"
          value={formatCurrency(data.aggregate.cpm)}
          hint="custo por mil impr."
        />
        <MicroCard
          icon={Percent}
          label="CTR"
          value={`${data.aggregate.ctr.toFixed(2)}%`}
          hint="cliques ÷ impressões"
        />
        <MicroCard
          icon={CircleDollarSign}
          label="CPC"
          value={formatCurrency(data.aggregate.cpc)}
          hint="custo por clique"
        />
        <MicroCard
          icon={TrendingUp}
          label="ROAS"
          value={`${data.aggregate.roas.toFixed(2)}x`}
          hint="receita ÷ investido"
        />
      </div>

      <BucketSection summary={data.perpetuo} accountId={accountId} />
      <BucketSection summary={data.lancamento} accountId={accountId} />

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

function MicroCard({
  icon: Icon,
  label,
  value,
  hint
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between mb-2">
          <div className="h-8 w-8 flex items-center justify-center rounded-md bg-brand-800 ring-1 ring-brand-700">
            <Icon className="h-3.5 w-3.5 text-accent-gold" />
          </div>
          <span className="text-[10px] uppercase tracking-wider text-ink-300 font-medium">
            {label}
          </span>
        </div>
        <p className="text-2xl font-semibold text-ink-50 tabular-nums">{value}</p>
        <p className="text-xs text-ink-300 mt-1">{hint}</p>
      </CardContent>
    </Card>
  );
}

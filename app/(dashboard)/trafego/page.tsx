// MOCKUP — Tráfego conectado com Meta Ads (dados estaticos).
// Implementacao real: lib/integrations/meta-ads.ts retornando { aggregate, perpetuo, lancamento }.
import { MetricCard } from "@/components/metric-card";
import { TrafficChart } from "./traffic-chart";
import { BucketSection } from "./_components/bucket-section";
import { RefreshButton } from "./_components/refresh-button";
import { PeriodSelector } from "@/components/period-selector";
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
  CircleDollarSign
} from "lucide-react";
import type { AdCardData } from "./_components/ad-card";

export const revalidate = 3600;

const aggregate = {
  spend: 12847.3,
  impressions: 845230,
  clicks: 18420,
  conversions: 142,
  revenue: 61667.04,
  cpm: 15.2,
  ctr: 2.18,
  cpc: 0.7,
  roas: 4.8
};

const perpetuoAds: AdCardData[] = [
  {
    id: "ad_001",
    name: "VSL Risotos | Versão 3 — Cozinha sem segredo",
    campaign: "PERP · Vendas Curso Risotos",
    format: "video",
    thumbnailGradient: "linear-gradient(135deg, #2D3E24, #62644C)",
    thumbnailEmoji: "🍚",
    spend: 2341.5,
    results: 78,
    resultLabel: "Compras",
    costPerResult: 30.02,
    hookRate: 42.1,
    holdRate: 68.4,
    ctr: 3.1,
    cpc: 0.62,
    cpm: 14.8
  },
  {
    id: "ad_002",
    name: "Carousel Receitas Plant-Based",
    campaign: "PERP · Vendas Catálogo",
    format: "image",
    thumbnailGradient: "linear-gradient(135deg, #936221, #C8A14B)",
    thumbnailEmoji: "🥗",
    spend: 1872.4,
    results: 51,
    resultLabel: "Compras",
    costPerResult: 36.71,
    ctr: 2.8,
    cpc: 0.74,
    cpm: 16.1
  },
  {
    id: "ad_003",
    name: "Reels — Cozinha Plant em 30s",
    campaign: "PERP · Vendas Curso Base",
    format: "video",
    thumbnailGradient: "linear-gradient(135deg, #402D1D, #936221)",
    thumbnailEmoji: "🥑",
    spend: 1205.9,
    results: 38,
    resultLabel: "Compras",
    costPerResult: 31.73,
    hookRate: 35.8,
    holdRate: 58.2,
    ctr: 2.4,
    cpc: 0.82,
    cpm: 15.4
  }
];

const lancamentoAds: AdCardData[] = [
  {
    id: "ad_101",
    name: "Live de Lançamento | Convite (Edit Curto)",
    campaign: "LANC · Maio Captação",
    format: "video",
    thumbnailGradient: "linear-gradient(135deg, #4E5B3A, #A9B196)",
    thumbnailEmoji: "🎥",
    spend: 1842.0,
    results: 240,
    resultLabel: "Leads",
    costPerResult: 7.68,
    hookRate: 51.3,
    holdRate: 72.1,
    ctr: 4.2,
    cpc: 0.45,
    cpm: 12.3
  },
  {
    id: "ad_102",
    name: "Lead Magnet — PDF 7 Receitas",
    campaign: "LANC · Maio Captação",
    format: "image",
    thumbnailGradient: "linear-gradient(135deg, #C8A14B, #DED2C6)",
    thumbnailEmoji: "📕",
    spend: 920.4,
    results: 142,
    resultLabel: "Leads",
    costPerResult: 6.48,
    ctr: 3.8,
    cpc: 0.51,
    cpm: 13.7
  },
  {
    id: "ad_103",
    name: "Stories | CTA Inscrição",
    campaign: "LANC · Aquecimento Lista",
    format: "video",
    thumbnailGradient: "linear-gradient(135deg, #232011, #4E5B3A)",
    thumbnailEmoji: "📲",
    spend: 587.2,
    results: 89,
    resultLabel: "Leads",
    costPerResult: 6.6,
    hookRate: 48.4,
    holdRate: 65.7,
    ctr: 5.1,
    cpc: 0.38,
    cpm: 10.2
  }
];

function bucketTotals(ads: AdCardData[]) {
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalResults = ads.reduce((s, a) => s + a.results, 0);
  const avgCost = totalResults > 0 ? totalSpend / totalResults : 0;
  return { totalSpend, totalResults, avgCost };
}

export default function TrafegoPage() {
  const perpTotals = bucketTotals(perpetuoAds);
  const lancTotals = bucketTotals(lancamentoAds);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-ink-50">Tráfego pago</h1>
          <p className="text-sm text-ink-300">
            Conectado a <code className="text-accent-gold font-mono">act_739218456</code> · última atualização há 12 min
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PeriodSelector />
          <RefreshButton />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Investido"
          value={formatCurrency(aggregate.spend)}
          icon={DollarSign}
          accent="terracotta"
        />
        <MetricCard
          label="Impressões"
          value={formatNumber(aggregate.impressions)}
          icon={Eye}
          accent="sage"
        />
        <MetricCard
          label="Cliques"
          value={formatNumber(aggregate.clicks)}
          icon={MousePointerClick}
          accent="gold"
        />
        <MetricCard
          label="Conversões"
          value={formatNumber(aggregate.conversions)}
          icon={Target}
          accent="brand"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MicroCard icon={ScanLine} label="CPM" value={formatCurrency(aggregate.cpm)} hint="custo por mil impr." />
        <MicroCard icon={Percent} label="CTR" value={`${aggregate.ctr.toFixed(2)}%`} hint="cliques ÷ impressões" />
        <MicroCard icon={CircleDollarSign} label="CPC" value={formatCurrency(aggregate.cpc)} hint="custo por clique" />
        <MicroCard icon={TrendingUp} label="ROAS" value={`${aggregate.roas.toFixed(2)}x`} hint="receita ÷ investido" />
      </div>

      <BucketSection
        bucket="perpetuo"
        ads={perpetuoAds}
        totalSpend={perpTotals.totalSpend}
        totalResults={perpTotals.totalResults}
        avgCostPerResult={perpTotals.avgCost}
      />

      <BucketSection
        bucket="lancamento"
        ads={lancamentoAds}
        totalSpend={lancTotals.totalSpend}
        totalResults={lancTotals.totalResults}
        avgCostPerResult={lancTotals.avgCost}
      />

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

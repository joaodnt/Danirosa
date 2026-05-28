// MOCKUP — Tráfego Meta Ads preview. Trocar por dados reais via lib/integrations/meta-ads.ts.
import { formatCurrency } from "@/lib/utils";
import { Video, Image as ImageIcon, ExternalLink } from "lucide-react";

export type AdCardData = {
  id: string;
  name: string;
  campaign: string;
  format: "video" | "image";
  thumbnailGradient: string;
  thumbnailEmoji?: string;
  spend: number;
  results: number;
  resultLabel: string;
  costPerResult: number;
  hookRate?: number;
  holdRate?: number;
  ctr: number;
  cpc: number;
  cpm: number;
};

export function AdCard({ ad, rank }: { ad: AdCardData; rank: number }) {
  const isVideo = ad.format === "video";
  const Icon = isVideo ? Video : ImageIcon;

  return (
    <div className="group rounded-xl border border-brand-800 bg-brand-900 overflow-hidden hover:border-accent-gold/40 hover:shadow-xl hover:shadow-black/40 transition-all flex flex-col">
      <div
        className="relative aspect-[16/10] flex items-center justify-center"
        style={{ background: ad.thumbnailGradient }}
      >
        {ad.thumbnailEmoji && (
          <div className="text-6xl opacity-90 group-hover:scale-110 transition-transform duration-500">
            {ad.thumbnailEmoji}
          </div>
        )}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-accent-gold uppercase tracking-widest">
          #{rank}
        </div>
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white uppercase tracking-wider">
          <Icon className="h-3 w-3" />
          {isVideo ? "Vídeo" : "Estático"}
        </div>
        <button className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ring-1 ring-white/20">
          <ExternalLink className="h-3.5 w-3.5 text-white" />
        </button>
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-medium text-sm text-ink-50 leading-snug line-clamp-2">
            {ad.name}
          </h3>
          <p className="text-xs text-ink-300 mt-0.5 truncate">{ad.campaign}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-brand-800">
          <Metric label="Investido" value={formatCurrency(ad.spend)} />
          <Metric label={ad.resultLabel} value={ad.results.toLocaleString("pt-BR")} />
          <Metric
            label="Custo/result"
            value={formatCurrency(ad.costPerResult)}
            highlight
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <KpiInline
            label="Hook"
            value={isVideo ? `${ad.hookRate!.toFixed(1)}%` : "—"}
            tone={isVideo ? quality(ad.hookRate!, [25, 40]) : "muted"}
          />
          <KpiInline
            label="Hold"
            value={isVideo ? `${ad.holdRate!.toFixed(1)}%` : "—"}
            tone={isVideo ? quality(ad.holdRate!, [40, 60]) : "muted"}
          />
          <KpiInline label="CTR" value={`${ad.ctr.toFixed(2)}%`} />
          <KpiInline label="CPC" value={formatCurrency(ad.cpc)} />
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
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

function KpiInline({
  label,
  value,
  tone = "default"
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "muted" | "default";
}) {
  const valueColor = {
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-red-400",
    muted: "text-ink-300",
    default: "text-ink-100"
  }[tone];

  return (
    <div className="flex items-center justify-between rounded-md bg-brand-950/50 ring-1 ring-brand-800 px-2 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-ink-300 font-medium">
        {label}
      </span>
      <span className={`text-xs font-semibold tabular-nums ${valueColor}`}>{value}</span>
    </div>
  );
}

function quality(value: number, [warn, good]: [number, number]): "good" | "warn" | "bad" {
  if (value >= good) return "good";
  if (value >= warn) return "warn";
  return "bad";
}

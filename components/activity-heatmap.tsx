import type { HeatmapDay } from "@/lib/dashboard/types";

type Props = { data: HeatmapDay[] };

function intensity(count: number, max: number): number {
  if (max === 0 || count === 0) return 0;
  const r = count / max;
  if (r > 0.75) return 4;
  if (r > 0.5) return 3;
  if (r > 0.25) return 2;
  return 1;
}

const levelClass: Record<number, string> = {
  0: "bg-brand-800/60",
  1: "bg-brand-600/60",
  2: "bg-brand-500/80",
  3: "bg-accent-terracotta/80",
  4: "bg-accent-gold"
};

function formatShortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d}/${String(m).padStart(2, "0")}`;
}

export function ActivityHeatmap({ data }: Props) {
  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;

  return (
    <div>
      <div className="grid grid-cols-15 gap-1" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
        {data.map((d) => (
          <div
            key={d.date}
            title={`${formatShortDate(d.date)} — ${d.count} eventos`}
            className={`aspect-square rounded-sm ${levelClass[intensity(d.count, max)]}`}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px] text-ink-300">
        <span>{first ? formatShortDate(first) : ""}</span>
        <div className="flex items-center gap-1.5">
          menos
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-800/60" />
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-600/60" />
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500/80" />
          <span className="h-2.5 w-2.5 rounded-sm bg-accent-terracotta/80" />
          <span className="h-2.5 w-2.5 rounded-sm bg-accent-gold" />
          mais
        </div>
        <span>{last ? formatShortDate(last) : ""}</span>
      </div>
    </div>
  );
}

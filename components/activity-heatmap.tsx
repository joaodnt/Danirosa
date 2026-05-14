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

function weekdayIndex(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  // Date.UTC avoids local TZ shift
  const dt = new Date(Date.UTC(y, m - 1, d));
  // getUTCDay: Sunday=0..Saturday=6 → convert to Monday=0..Sunday=6
  return (dt.getUTCDay() + 6) % 7;
}

export function ActivityHeatmap({ data }: Props) {
  const max = data.reduce((m, d) => Math.max(m, d.count), 0);
  const first = data[0]?.date;
  const last = data[data.length - 1]?.date;

  const padding = data.length > 0 ? weekdayIndex(data[0].date) : 0;
  const cells: ({ type: "pad" } | { type: "day"; day: HeatmapDay })[] = [
    ...Array.from({ length: padding }, () => ({ type: "pad" as const })),
    ...data.map((d) => ({ type: "day" as const, day: d }))
  ];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) =>
          c.type === "pad" ? (
            <div key={`pad-${i}`} className="aspect-square" />
          ) : (
            <div
              key={c.day.date}
              title={`${formatShortDate(c.day.date)} — ${c.day.count} eventos`}
              className={`aspect-square rounded-sm ${levelClass[intensity(c.day.count, max)]}`}
            />
          )
        )}
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

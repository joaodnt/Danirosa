import type { Period, PresetKey } from "./types";

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export function presetToRange(preset: PresetKey): { from: string; until: string } {
  const today = isoDate(new Date());
  if (preset === "7d") return { from: isoDate(daysAgo(7)), until: today };
  if (preset === "30d") return { from: isoDate(daysAgo(30)), until: today };
  if (preset === "90d") return { from: isoDate(daysAgo(90)), until: today };
  if (preset === "month") {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: isoDate(first), until: today };
  }
  return { from: isoDate(daysAgo(30)), until: today };
}

function isIsoDate(s: string | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function parsePeriod(searchParams: {
  from?: string | string[];
  to?: string | string[];
  period?: string | string[];
}): Period {
  const presetRaw = Array.isArray(searchParams.period) ? searchParams.period[0] : searchParams.period;
  const fromRaw = Array.isArray(searchParams.from) ? searchParams.from[0] : searchParams.from;
  const toRaw = Array.isArray(searchParams.to) ? searchParams.to[0] : searchParams.to;

  if (isIsoDate(fromRaw) && isIsoDate(toRaw)) {
    return { from: fromRaw, until: toRaw, preset: "custom" };
  }

  const validPresets: PresetKey[] = ["7d", "30d", "90d", "month"];
  const preset = (validPresets.includes(presetRaw as PresetKey) ? presetRaw : "30d") as PresetKey;
  const { from, until } = presetToRange(preset);
  return { from, until, preset };
}

const monthsPt = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
];

function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} de ${monthsPt[m - 1]}`;
}

export function formatRange(p: Period): string {
  const fromYear = p.from.slice(0, 4);
  const untilYear = p.until.slice(0, 4);
  if (fromYear === untilYear) {
    return `${formatDate(p.from)} → ${formatDate(p.until)} de ${untilYear}`;
  }
  return `${formatDate(p.from)} de ${fromYear} → ${formatDate(p.until)} de ${untilYear}`;
}

export function presetLabel(preset: PresetKey): string {
  return preset === "month" ? "Mês" : preset === "custom" ? "Custom" : preset;
}

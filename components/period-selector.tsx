"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { parsePeriod, presetToRange } from "@/lib/dashboard/period";
import type { PresetKey } from "@/lib/dashboard/types";

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "month", label: "Mês" }
];

export function PeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const period = parsePeriod(Object.fromEntries(searchParams));
  const [isPending, startTransition] = useTransition();
  const [customOpen, setCustomOpen] = useState(period.preset === "custom");
  const [customFrom, setCustomFrom] = useState(period.from);
  const [customUntil, setCustomUntil] = useState(period.until);

  function applyPreset(preset: PresetKey) {
    const params = new URLSearchParams();
    params.set("period", preset);
    setCustomOpen(false);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function applyCustom() {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(customFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(customUntil)) return;
    const params = new URLSearchParams();
    params.set("from", customFrom);
    params.set("to", customUntil);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="inline-flex items-center gap-1 rounded-md bg-brand-900 p-1 ring-1 ring-brand-800">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => applyPreset(p.key)}
            disabled={isPending}
            className={cn(
              "px-3 py-1.5 text-xs rounded font-medium transition-colors",
              period.preset === p.key
                ? "bg-accent-gold text-brand-950"
                : "text-ink-200 hover:bg-brand-800"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => setCustomOpen((v) => !v)}
          disabled={isPending}
          className={cn(
            "ml-1 pl-3 border-l border-brand-800 px-3 py-1.5 text-xs rounded inline-flex items-center gap-1.5 font-medium transition-colors",
            period.preset === "custom"
              ? "bg-accent-gold text-brand-950"
              : "text-ink-200 hover:bg-brand-800"
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          Custom
        </button>
      </div>

      {customOpen && (
        <div className="flex items-center gap-2 bg-brand-900 ring-1 ring-brand-800 rounded-md p-2 text-xs">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="bg-brand-950 text-ink-50 px-2 py-1 rounded ring-1 ring-brand-800"
          />
          <span className="text-ink-300">até</span>
          <input
            type="date"
            value={customUntil}
            onChange={(e) => setCustomUntil(e.target.value)}
            className="bg-brand-950 text-ink-50 px-2 py-1 rounded ring-1 ring-brand-800"
          />
          <button
            onClick={applyCustom}
            disabled={isPending}
            className="px-3 py-1 bg-accent-gold text-brand-950 rounded font-medium"
          >
            Aplicar
          </button>
        </div>
      )}
    </div>
  );
}

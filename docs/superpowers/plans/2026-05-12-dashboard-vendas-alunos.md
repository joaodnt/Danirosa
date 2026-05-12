# Dashboard Vendas + Alunos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar uma seção "Dashboard" expansível à sidebar do painel Dani Rosa, contendo duas páginas de métricas (Vendas e Alunos) com seletor de período compartilhado via URL.

**Architecture:** Next.js 15 App Router. Páginas server-rendered com `revalidate=300`. Estado do período fica em search params (`?from=&to=`), parseado no `layout.tsx` da seção `/dashboard/*` e injetado nas pages. Queries em `lib/dashboard/*.ts` centralizam acesso ao Supabase + Meta Ads API. Three Postgres functions (RPCs) encapsulam joins complexos de progressão/conclusão/tempo até 1ª aula.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind, Supabase (Postgres + RLS), Recharts 2.15, lucide-react. Sem framework de teste — validação manual via dev server.

**Spec:** `docs/superpowers/specs/2026-05-12-dashboard-vendas-alunos-design.md`

**Pre-requisitos:**
- Repo já clonado em `/Users/joao/Danirosa`
- Supabase CLI já linkado ao projeto `fbsximiqrpowhdskdcrl`
- `.env.local` já tem `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Dev server roda em http://localhost:3001 (`npm run dev`)

---

## Task 1: Schema — `manual_costs` + 3 RPCs

**Files:**
- Modify: `supabase/schema.sql` (append no final do arquivo)

- [ ] **Step 1: Adicionar bloco no final de `supabase/schema.sql`**

Append este bloco ao final do arquivo:

```sql
-- =====================================================
-- Dashboard (Vendas + Alunos) — schema da Fase 1
-- =====================================================

create table if not exists public.manual_costs (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  amount numeric(10,2) not null check (amount >= 0),
  occurred_at date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists manual_costs_occurred_at_idx
  on public.manual_costs(occurred_at desc);

alter table public.manual_costs enable row level security;

drop policy if exists "Authenticated can read manual costs" on public.manual_costs;
create policy "Authenticated can read manual costs"
  on public.manual_costs for select to authenticated using (true);

drop policy if exists "Authenticated can write manual costs" on public.manual_costs;
create policy "Authenticated can write manual costs"
  on public.manual_costs for insert to authenticated with check (true);

-- Progressão média na "aula/curso atual" dos alunos.
-- Para cada aluno: último lesson_viewed define o curso atual.
-- pct = lessons_completed naquele curso / total_lessons no curso.
-- lessons → modules → courses (lessons.module_id, modules.course_id).
create or replace function dashboard_progressao_media()
returns numeric language sql stable as $$
  with current_course as (
    select distinct on (a.student_id)
      a.student_id, (a.metadata->>'course_id')::uuid as course_id
    from activities a
    where a.event_type = 'lesson_viewed'
      and a.metadata ? 'course_id'
    order by a.student_id, a.occurred_at desc
  ),
  per_student as (
    select cc.student_id,
      count(*) filter (where a.event_type='lesson_completed')::numeric
        / nullif((
          select count(*) from lessons l
          join modules m on m.id = l.module_id
          where m.course_id = cc.course_id
        ), 0) as pct
    from current_course cc
    join activities a
      on a.student_id = cc.student_id
     and (a.metadata->>'course_id')::uuid = cc.course_id
    group by cc.student_id, cc.course_id
  )
  select coalesce(avg(pct), 0) from per_student;
$$;

-- Taxa de conclusão (cumulativa, % de alunos que completaram todas as lessons
-- de pelo menos um curso). Não há event 'course_completed' no app — derivado.
create or replace function dashboard_taxa_conclusao()
returns numeric language sql stable as $$
  with completed_per_course as (
    select a.student_id, (a.metadata->>'course_id')::uuid as course_id,
           count(distinct (a.metadata->>'lesson_id')::uuid) as done
    from activities a
    where a.event_type = 'lesson_completed'
      and a.metadata ? 'course_id'
      and a.metadata ? 'lesson_id'
    group by a.student_id, (a.metadata->>'course_id')::uuid
  ),
  total_per_course as (
    select c.id as course_id, count(l.*) as total
    from courses c
    join modules m on m.course_id = c.id
    join lessons l on l.module_id = m.id
    group by c.id
  ),
  concluded as (
    select distinct cpc.student_id
    from completed_per_course cpc
    join total_per_course tpc on tpc.course_id = cpc.course_id
    where cpc.done >= tpc.total and tpc.total > 0
  )
  select coalesce(
    (select count(*) from concluded)::numeric * 100
    / nullif((select count(*) from students), 0),
    0
  );
$$;

-- Tempo médio (em dias) entre matrícula e 1ª lesson_viewed.
-- Considera apenas novos alunos do período.
create or replace function dashboard_tempo_primeira_aula(p_from date, p_until date)
returns numeric language sql stable as $$
  select coalesce(avg(
    extract(epoch from (fv.first_view - s.enrolled_at)) / 86400
  ), 0)
  from students s
  cross join lateral (
    select min(occurred_at) as first_view
    from activities
    where student_id = s.id and event_type = 'lesson_viewed'
  ) fv
  where s.enrolled_at::date between p_from and p_until
    and fv.first_view is not null;
$$;
```

- [ ] **Step 2: Aplicar no Supabase remoto**

Run:
```bash
cd /Users/joao/Danirosa
supabase db query --linked -f supabase/schema.sql
```
Expected: `"rows":[],"warning":...` (DDL não retorna linhas; sem erros).

- [ ] **Step 3: Verificar que a tabela e as 3 functions existem**

Run:
```bash
supabase db query --linked --output table \
  "select relname from pg_class where relname in ('manual_costs','dashboard_progressao_media','dashboard_taxa_conclusao','dashboard_tempo_primeira_aula');"
```
Expected: 4 linhas, uma pra cada objeto.

- [ ] **Step 4: Smoke test das functions**

Run:
```bash
supabase db query --linked --output table "select dashboard_progressao_media() as progressao, dashboard_taxa_conclusao() as conclusao, dashboard_tempo_primeira_aula('2026-04-12','2026-05-12') as tempo;"
```
Expected: 3 colunas com valores numéricos (provavelmente 0 — está sem dados). Sem erro de sintaxe.

- [ ] **Step 5: Commit**

```bash
cd /Users/joao/Danirosa
git add supabase/schema.sql
git commit -m "feat(db): tabela manual_costs e 3 funcoes do dashboard"
```

---

## Task 2: Types + Period helper (`lib/dashboard/types.ts`, `period.ts`)

**Files:**
- Create: `lib/dashboard/types.ts`
- Create: `lib/dashboard/period.ts`

- [ ] **Step 1: Criar `lib/dashboard/types.ts`**

```ts
export type PresetKey = "7d" | "30d" | "90d" | "month" | "custom";

export type Period = {
  /** ISO date "YYYY-MM-DD" inclusive */
  from: string;
  /** ISO date "YYYY-MM-DD" inclusive */
  until: string;
  preset: PresetKey;
};

export type VendasMetrics = {
  resultado: number;
  investimento: number;
  roas: number;
  cpm: number;
  cpa: number;
  imposto: number;
  impostoPct: number;
  plataforma: number;
  platPct: number;
  custosManuais: number;
  lucroReal: number;
};

export type DistribuicaoCurso = { course: string; alunos: number };
export type HeatmapDay = { date: string; count: number };

export type AlunosMetrics = {
  ativos: number;
  novos: number;
  progressaoMedia: number;
  taxaConclusao: number;
  churn: number;
  tempoPrimeiraAula: number;
  distribuicao: DistribuicaoCurso[];
  heatmap: HeatmapDay[];
};
```

- [ ] **Step 2: Criar `lib/dashboard/period.ts`**

```ts
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
```

- [ ] **Step 3: Verificar que tudo compila**

Run:
```bash
cd /Users/joao/Danirosa
npx tsc --noEmit
```
Expected: sem erros TypeScript. Pode haver warnings de outros arquivos, mas não em `lib/dashboard/*`.

- [ ] **Step 4: Commit**

```bash
git add lib/dashboard/types.ts lib/dashboard/period.ts
git commit -m "feat(dashboard): types e helper de periodo"
```

---

## Task 3: `PeriodSelector` component

**Files:**
- Create: `components/period-selector.tsx`

- [ ] **Step 1: Criar `components/period-selector.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros novos em `components/period-selector.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/period-selector.tsx
git commit -m "feat(dashboard): PeriodSelector client component"
```

---

## Task 4: `StatCard` component

**Files:**
- Create: `components/stat-card.tsx`

- [ ] **Step 1: Criar `components/stat-card.tsx`**

```tsx
import { cn } from "@/lib/utils";

type Source = "Meta" | "Hotmart";

type Props = {
  label: string;
  value: string;
  source?: Source;
  sub?: string;
  variant?: "default" | "highlight";
  className?: string;
  children?: React.ReactNode;
};

const sourceClass: Record<Source, string> = {
  Meta: "bg-brand-800/60 text-accent-terracotta",
  Hotmart: "bg-brand-700/40 text-brand-100"
};

export function StatCard({
  label,
  value,
  source,
  sub,
  variant = "default",
  className,
  children
}: Props) {
  return (
    <div
      className={cn(
        "rounded-lg p-4 ring-1 transition-colors",
        variant === "highlight"
          ? "bg-gradient-to-br from-brand-700/60 to-brand-900 ring-accent-gold/40 p-6"
          : "bg-brand-900 ring-brand-800",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-[10px] uppercase tracking-wider",
          variant === "highlight" ? "text-accent-gold" : "text-ink-300"
        )}
      >
        <span>{label}</span>
        {source && (
          <span className={cn("text-[9px] rounded px-1.5 py-0.5", sourceClass[source])}>
            {source}
          </span>
        )}
      </div>
      <div
        className={cn(
          "mt-2 font-semibold tabular-nums",
          variant === "highlight"
            ? "text-[2.25rem] leading-none text-ink-50"
            : "text-2xl text-ink-50"
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[11px] text-ink-300">{sub}</div>}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros em `components/stat-card.tsx`.

- [ ] **Step 3: Commit**

```bash
git add components/stat-card.tsx
git commit -m "feat(dashboard): StatCard component"
```

---

## Task 5: `lib/dashboard/vendas.ts` — query layer

**Files:**
- Create: `lib/dashboard/vendas.ts`

- [ ] **Step 1: Criar `lib/dashboard/vendas.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import { fetchMetaAdsMetrics } from "@/lib/integrations/meta-ads";
import type { Period, VendasMetrics } from "./types";

export async function getVendasMetrics(period: Period): Promise<VendasMetrics> {
  const supabase = await createClient();

  const [ordersResult, ads, costsResult] = await Promise.all([
    supabase
      .from("orders")
      .select("amount, status")
      .eq("status", "paid")
      .gte("purchased_at", period.from)
      .lte("purchased_at", period.until),
    fetchMetaAdsMetrics(period.from, period.until),
    supabase
      .from("manual_costs")
      .select("amount")
      .gte("occurred_at", period.from)
      .lte("occurred_at", period.until)
  ]);

  const ordersRows = ordersResult.data ?? [];
  const costsRows = costsResult.data ?? [];

  const resultado = ordersRows.reduce((s, r) => s + Number(r.amount), 0);
  const ordersCount = ordersRows.length;

  const impostoPct = Number(process.env.DASHBOARD_IMPOSTO_PCT ?? 6);
  const platPct = Number(process.env.DASHBOARD_PLATAFORMA_PCT ?? 9.9);

  const imposto = resultado * (impostoPct / 100);
  const plataforma = resultado * (platPct / 100);
  const custosManuais = costsRows.reduce((s, r) => s + Number(r.amount), 0);

  const investimento = ads.spend;
  const cpm = (ads as { cpm?: number }).cpm ?? (ads.impressions > 0 ? (ads.spend / ads.impressions) * 1000 : 0);
  const cpa = ordersCount > 0 ? investimento / ordersCount : 0;
  const roas = investimento > 0 ? resultado / investimento : 0;
  const lucroReal = resultado - investimento - imposto - plataforma - custosManuais;

  return {
    resultado,
    investimento,
    roas,
    cpm,
    cpa,
    imposto,
    impostoPct,
    plataforma,
    platPct,
    custosManuais,
    lucroReal
  };
}
```

Note: `fetchMetaAdsMetrics` retorna `TrafficMetrics` que tem `impressions` mas não `cpm` direto — o fallback `(spend / impressions) * 1000` cobre o caso. A linha `(ads as { cpm?: number }).cpm` é defensiva caso a API real venha a expor `cpm` direto.

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros em `lib/dashboard/vendas.ts`.

- [ ] **Step 3: Commit**

```bash
git add lib/dashboard/vendas.ts
git commit -m "feat(dashboard): query layer de Vendas"
```

---

## Task 6: `lib/dashboard/alunos.ts` — query layer

**Files:**
- Create: `lib/dashboard/alunos.ts`

- [ ] **Step 1: Criar `lib/dashboard/alunos.ts`**

```ts
import { createClient } from "@/lib/supabase/server";
import type { Period, AlunosMetrics, DistribuicaoCurso, HeatmapDay } from "./types";

function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function aggregateByCourse(rows: { course: string | null }[]): DistribuicaoCurso[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.course && r.course.trim() ? r.course : "Sem curso";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([course, alunos]) => ({ course, alunos }))
    .sort((a, b) => b.alunos - a.alunos);
}

function aggregateByDay(rows: { occurred_at: string }[]): HeatmapDay[] {
  const map = new Map<string, number>();
  // Pre-popula 30 dias zerados para o grid não ter buracos
  for (let i = 29; i >= 0; i--) {
    map.set(daysAgoIso(i), 0);
  }
  for (const r of rows) {
    const day = r.occurred_at.split("T")[0];
    if (map.has(day)) map.set(day, (map.get(day) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([date, count]) => ({ date, count }));
}

export async function getAlunosMetrics(period: Period): Promise<AlunosMetrics> {
  const supabase = await createClient();
  const heatmapFrom = daysAgoIso(30);

  const [
    ativosRes,
    novosRes,
    progressaoRes,
    conclusaoRes,
    churnRes,
    tempoPrimeiraRes,
    distribuicaoRes,
    heatmapRes
  ] = await Promise.allSettled([
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .gte("enrolled_at", period.from)
      .lte("enrolled_at", period.until),
    supabase.rpc("dashboard_progressao_media"),
    supabase.rpc("dashboard_taxa_conclusao"),
    supabase.rpc("dashboard_churn"),
    supabase.rpc("dashboard_tempo_primeira_aula", {
      p_from: period.from,
      p_until: period.until
    }),
    supabase.from("students").select("course").eq("status", "active"),
    supabase
      .from("activities")
      .select("occurred_at")
      .gte("occurred_at", heatmapFrom)
  ]);

  function num(res: PromiseSettledResult<{ data: number | null } | { count: number | null }>): number {
    if (res.status !== "fulfilled") return 0;
    const v = (res.value as { data?: number | null; count?: number | null });
    return Number(v.data ?? v.count ?? 0);
  }

  function rows<T>(res: PromiseSettledResult<{ data: T[] | null }>): T[] {
    if (res.status !== "fulfilled") return [];
    return res.value.data ?? [];
  }

  return {
    ativos: num(ativosRes),
    novos: num(novosRes),
    progressaoMedia: num(progressaoRes) * 100, // function retorna fração (0..1)
    taxaConclusao: num(conclusaoRes),           // function já retorna %
    churn: num(churnRes),
    tempoPrimeiraAula: num(tempoPrimeiraRes),
    distribuicao: aggregateByCourse(rows<{ course: string | null }>(distribuicaoRes)),
    heatmap: aggregateByDay(rows<{ occurred_at: string }>(heatmapRes))
  };
}
```

Note: `dashboard_churn` ainda não existe no schema — vou adicionar nesta task como complemento.

- [ ] **Step 2: Adicionar `dashboard_churn` ao `supabase/schema.sql`**

Append ao final do arquivo:

```sql
-- Churn / inativos: alunos churned ou sem atividade nos últimos 30 dias
create or replace function dashboard_churn()
returns integer language sql stable as $$
  select count(*)::integer from students s
  where s.status = 'churned'
     or not exists (
       select 1 from activities a
       where a.student_id = s.id
         and a.occurred_at > now() - interval '30 days'
     );
$$;
```

- [ ] **Step 3: Aplicar no Supabase**

Run:
```bash
supabase db query --linked -f supabase/schema.sql
```
Expected: sem erros.

- [ ] **Step 4: Smoke test**

Run:
```bash
supabase db query --linked --output table "select dashboard_churn() as churn;"
```
Expected: 1 linha com valor inteiro (provavelmente 0 ou similar).

- [ ] **Step 5: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros em `lib/dashboard/alunos.ts`.

- [ ] **Step 6: Commit**

```bash
git add lib/dashboard/alunos.ts supabase/schema.sql
git commit -m "feat(dashboard): query layer de Alunos + funcao dashboard_churn"
```

---

## Task 7: `DistributionDonut` component

**Files:**
- Create: `components/distribution-donut.tsx`

- [ ] **Step 1: Criar `components/distribution-donut.tsx`**

```tsx
"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import type { DistribuicaoCurso } from "@/lib/dashboard/types";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#C8A14B", "#936221", "#3A4A2E", "#62644C", "#7C7F59", "#232011"];

type Props = { data: DistribuicaoCurso[] };

export function DistributionDonut({ data }: Props) {
  const total = data.reduce((s, d) => s + d.alunos, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-44 text-sm text-ink-300">
        Sem dados de alunos ativos
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-36 h-36 flex-shrink-0">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="alunos"
              nameKey="course"
              innerRadius={40}
              outerRadius={70}
              strokeWidth={0}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2 text-xs">
        {data.slice(0, 6).map((d, i) => (
          <li key={d.course} className="flex items-center gap-2 text-ink-100">
            <span
              className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}
            />
            <span className="truncate">{d.course}</span>
            <span className="ml-auto tabular-nums text-ink-300">
              {formatNumber(d.alunos)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/distribution-donut.tsx
git commit -m "feat(dashboard): DistributionDonut component"
```

---

## Task 8: `ActivityHeatmap` component

**Files:**
- Create: `components/activity-heatmap.tsx`

- [ ] **Step 1: Criar `components/activity-heatmap.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add components/activity-heatmap.tsx
git commit -m "feat(dashboard): ActivityHeatmap component"
```

---

## Task 9: `/dashboard/layout.tsx`

**Files:**
- Create: `app/(dashboard)/dashboard/layout.tsx`

- [ ] **Step 1: Criar `app/(dashboard)/dashboard/layout.tsx`**

```tsx
import { PeriodSelector } from "@/components/period-selector";

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <PeriodSelector />
      </div>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/layout.tsx
git commit -m "feat(dashboard): layout com PeriodSelector"
```

---

## Task 10: `/dashboard/page.tsx` (redirect)

**Files:**
- Create: `app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Criar `app/(dashboard)/dashboard/page.tsx`**

```tsx
import { redirect } from "next/navigation";

export default async function DashboardIndex({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") qs.set(k, v);
  }
  const query = qs.toString();
  redirect(query ? `/dashboard/vendas?${query}` : "/dashboard/vendas");
}
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(dashboard): redirect /dashboard -> /dashboard/vendas"
```

---

## Task 11: `/dashboard/vendas/page.tsx`

**Files:**
- Create: `app/(dashboard)/dashboard/vendas/page.tsx`

- [ ] **Step 1: Criar `app/(dashboard)/dashboard/vendas/page.tsx`**

```tsx
import { StatCard } from "@/components/stat-card";
import { getVendasMetrics } from "@/lib/dashboard/vendas";
import { parsePeriod, formatRange } from "@/lib/dashboard/period";
import { formatCurrency } from "@/lib/utils";

export const revalidate = 300;

export default async function VendasPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const m = await getVendasMetrics(period);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold text-ink-50">Vendas</h1>
        <p className="text-xs text-ink-300 mt-1">{formatRange(period)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Resultado" value={formatCurrency(m.resultado)} source="Hotmart" />
        <StatCard label="Investimento (Ads)" value={formatCurrency(m.investimento)} source="Meta" />
        <StatCard label="ROAS" value={`${m.roas.toFixed(2)}×`} sub="Resultado ÷ Investimento" />
        <StatCard label="CPM" value={formatCurrency(m.cpm)} source="Meta" sub="Custo por mil impressões" />
        <StatCard label="CPA" value={formatCurrency(m.cpa)} sub="Investimento ÷ # vendas" />
        <StatCard
          label="Imposto"
          value={formatCurrency(m.imposto)}
          sub={`${m.impostoPct.toFixed(1)}% do Resultado`}
        />
      </div>

      <StatCard label="Lucro Real" value={formatCurrency(m.lucroReal)} variant="highlight">
        <div className="mt-4 pt-4 border-t border-accent-gold/20 flex flex-wrap gap-x-5 gap-y-2 text-[11px] text-ink-200">
          <span>
            Resultado <b className="text-ink-50 font-medium">{formatCurrency(m.resultado)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Investimento{" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.investimento)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Imposto ({m.impostoPct.toFixed(1)}%){" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.imposto)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Plataforma ({m.platPct.toFixed(1)}%){" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.plataforma)}</b>
          </span>
          <span className="text-accent-terracotta">
            − Custos manuais{" "}
            <b className="text-ink-50 font-medium">{formatCurrency(m.custosManuais)}</b>
          </span>
        </div>
      </StatCard>
    </div>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Validar no dev server**

Run em terminal separado se o dev server não estiver rodando:
```bash
npm run dev
```

Em outro terminal:
```bash
curl -sI http://localhost:3001/dashboard/vendas | head -5
```
Expected: `HTTP/1.1 307` redirecionando pra `/login` (porque rota é protegida). Logado, abrir no browser http://localhost:3001/dashboard/vendas e ver:
- Título "Vendas"
- 6 cards 2-3 colunas (Resultado/Investimento/ROAS/CPM/CPA/Imposto)
- Card grande "Lucro Real" com breakdown embaixo
- Sem erros no console do navegador

Note: Sidebar ainda não tem o link Dashboard nesta task — navega via URL.

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/dashboard/vendas/page.tsx
git commit -m "feat(dashboard): pagina /dashboard/vendas"
```

---

## Task 12: `/dashboard/alunos/page.tsx`

**Files:**
- Create: `app/(dashboard)/dashboard/alunos/page.tsx`

- [ ] **Step 1: Criar `app/(dashboard)/dashboard/alunos/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Validar no dev server**

Abrir no browser http://localhost:3001/dashboard/alunos. Esperado:
- Título "Alunos"
- 6 cards (Ativos / Novos / Progressão / Conclusão / Churn / Tempo)
- Donut (com mensagem "Sem dados" se não houver alunos ativos)
- Heatmap 30 dias

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/dashboard/alunos/page.tsx
git commit -m "feat(dashboard): pagina /dashboard/alunos"
```

---

## Task 13: Sidebar — item Dashboard expansível

**Files:**
- Modify: `components/sidebar.tsx`

- [ ] **Step 1: Substituir o conteúdo de `components/sidebar.tsx` por:**

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  TrendingUp,
  GraduationCap,
  Zap,
  Users,
  BookOpen,
  BarChart3,
  ChevronDown
} from "lucide-react";

type NavLink = { href: string; label: string };
type NavItem =
  | { type: "link"; href: string; label: string; icon: typeof LayoutDashboard }
  | { type: "group"; id: string; label: string; icon: typeof LayoutDashboard; children: NavLink[] };

const items: NavItem[] = [
  { type: "link", href: "/", label: "Início", icon: LayoutDashboard },
  {
    type: "group",
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    children: [
      { href: "/dashboard/vendas", label: "Vendas" },
      { href: "/dashboard/alunos", label: "Alunos" }
    ]
  },
  { type: "link", href: "/membros", label: "Área de membros", icon: BookOpen },
  { type: "link", href: "/trafego", label: "Tráfego pago", icon: TrendingUp },
  { type: "link", href: "/concorrentes", label: "Concorrentes", icon: Users },
  { type: "link", href: "/alunos", label: "Alunos", icon: GraduationCap },
  { type: "link", href: "/automacoes", label: "Automações", icon: Zap }
];

export function Sidebar() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => {
    const s = new Set<string>();
    if (pathname.startsWith("/dashboard")) s.add("dashboard");
    return s;
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:flex-col border-r border-brand-800 bg-brand-950">
      <div className="flex flex-col gap-2 px-6 py-4 border-b border-brand-800">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Dani Rosa"
            className="h-10 w-10 rounded-full object-cover ring-1 ring-brand-600"
          />
          <span className="font-semibold text-ink-50 tracking-tight">Dani Rosa</span>
        </div>
        <p className="font-handwritten text-accent-gold/90 text-lg leading-tight -rotate-1 pl-1">
          O lado sexy dos vegetais
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          if (item.type === "link") {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-800 text-accent-gold"
                    : "text-ink-200 hover:bg-brand-900 hover:text-ink-50"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          }

          const Icon = item.icon;
          const isOpen = openGroups.has(item.id);
          const inGroup = pathname.startsWith(`/${item.id}`);

          return (
            <div key={item.id}>
              <button
                onClick={() => toggleGroup(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  inGroup
                    ? "text-accent-gold"
                    : "text-ink-200 hover:bg-brand-900 hover:text-ink-50"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
                <ChevronDown
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform",
                    isOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>
              {isOpen && (
                <div className="ml-3 mt-1 space-y-0.5 border-l border-brand-800 pl-3">
                  {item.children.map((child) => {
                    const childActive = pathname.startsWith(child.href);
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={cn(
                          "block rounded-md px-3 py-2 text-xs font-medium transition-colors",
                          childActive
                            ? "bg-brand-800 text-accent-gold"
                            : "text-ink-200 hover:bg-brand-900 hover:text-ink-50"
                        )}
                      >
                        {child.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-brand-800 p-4">
        <p className="text-xs text-ink-300">v0.1 · painel interno</p>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verificar TypeScript**

Run:
```bash
npx tsc --noEmit
```
Expected: sem erros.

- [ ] **Step 3: Validar no dev server**

Recarregar http://localhost:3001/. Esperado na sidebar:
- Item "Dashboard" com ícone de gráfico e chevron à direita
- Click expande mostrando "Vendas" e "Alunos" indentados
- Estando em `/dashboard/vendas`: o grupo abre automaticamente, label do pai fica em dourado, sub-item Vendas com fundo destacado
- Outros links (Início, Área de membros, etc.) inalterados

- [ ] **Step 4: Commit**

```bash
git add components/sidebar.tsx
git commit -m "feat(sidebar): grupo Dashboard expansivel com Vendas e Alunos"
```

---

## Task 14: `.env.example` + validação final

**Files:**
- Modify: `.env.example`

- [ ] **Step 1: Adicionar ao final do `.env.example`**

Conteúdo final de `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

META_ACCESS_TOKEN=
META_AD_ACCOUNT_ID=
IG_BUSINESS_ACCOUNT_ID=

GOOGLE_ADS_DEVELOPER_TOKEN=
GOOGLE_ADS_CUSTOMER_ID=
GOOGLE_ADS_REFRESH_TOKEN=
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=

# Dashboard — porcentagens de dedução do Lucro Real
DASHBOARD_IMPOSTO_PCT=6.0
DASHBOARD_PLATAFORMA_PCT=9.9
```

Adicionar também ao `.env.local` (sem commitar):

```
DASHBOARD_IMPOSTO_PCT=6.0
DASHBOARD_PLATAFORMA_PCT=9.9
```

- [ ] **Step 2: Validação manual completa**

Com dev server rodando em http://localhost:3001 e logado:

| Verificação | Esperado |
|------|----------|
| Clicar "Dashboard" na sidebar | Expande mostrando Vendas e Alunos |
| Clicar em "Vendas" | Vai pra `/dashboard/vendas`, mostra 6 cards + Lucro Real, sidebar fica com grupo aberto e item ativo dourado |
| Clicar em "Alunos" sob Dashboard | Vai pra `/dashboard/alunos`, mostra KPIs + donut + heatmap |
| Clicar preset "7d" no PeriodSelector | URL muda pra `?period=7d`, métricas recalculam, subtítulo mostra novo range |
| Clicar "Custom", preencher datas, "Aplicar" | URL muda pra `?from=YYYY-MM-DD&to=YYYY-MM-DD`, métricas recalculam |
| Acessar `/dashboard` direto | Redireciona pra `/dashboard/vendas` (preservando params se houver) |
| Acessar `/alunos` (sidebar item antigo) | Lista de alunos abre normal, sem mexer no Dashboard |
| Inserir manual_cost via Supabase (`insert into manual_costs (label, amount, occurred_at) values ('Comissão teste', 500, current_date)`) | Lucro Real cai em R$ 500 na próxima recarga |

- [ ] **Step 3: Commit final**

```bash
git add .env.example
git commit -m "chore(dashboard): env vars de imposto e plataforma"
```

---

## Pós-implementação (opcional)

- Documentar em README.md a estrutura nova de `/dashboard/*` (próximo PR)
- Considerar adicionar `--check` e `--lint` na CI quando ela existir
- Phase 2 (Hotmart) ficará em spec separado quando Dani tiver acesso à plataforma

---

## Sumário

| # | Tarefa | Arquivos |
|---|--------|----------|
| 1 | Schema + 3 RPCs | `supabase/schema.sql` |
| 2 | Types + period helper | `lib/dashboard/types.ts`, `period.ts` |
| 3 | PeriodSelector | `components/period-selector.tsx` |
| 4 | StatCard | `components/stat-card.tsx` |
| 5 | Vendas data layer | `lib/dashboard/vendas.ts` |
| 6 | Alunos data layer + `dashboard_churn` | `lib/dashboard/alunos.ts`, `supabase/schema.sql` |
| 7 | DistributionDonut | `components/distribution-donut.tsx` |
| 8 | ActivityHeatmap | `components/activity-heatmap.tsx` |
| 9 | `/dashboard/layout.tsx` | App router |
| 10 | `/dashboard/page.tsx` (redirect) | App router |
| 11 | `/dashboard/vendas/page.tsx` | App router |
| 12 | `/dashboard/alunos/page.tsx` | App router |
| 13 | Sidebar expansível | `components/sidebar.tsx` |
| 14 | env.example + validação | `.env.example` |

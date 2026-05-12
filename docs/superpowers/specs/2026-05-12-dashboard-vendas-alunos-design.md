# Design — Dashboard com Vendas e Alunos

**Data:** 2026-05-12
**Status:** Spec aprovado (aguardando plano de implementação)
**Escopo:** Fase 1 (estrutural). Hotmart fica para Fase 2 separada.

---

## 1. Objetivo

Adicionar uma seção "Dashboard" ao painel Dani Rosa contendo duas páginas de métricas — **Vendas** e **Alunos** — para a Dani acompanhar saúde do negócio sem precisar abrir vários sistemas.

O painel atual (Início, Área de membros, Tráfego pago, Concorrentes, Alunos, Automações) permanece intacto. A entrega é incremental e plugável: quando a integração Hotmart entrar em uma Fase 2, ela passa a popular `orders` automaticamente e os números da página Vendas se preenchem sem refazer nada.

## 2. Não-objetivos

- Integração com Hotmart (separado, Fase 2).
- Tela de configuração para Imposto%, Plataforma% e custos manuais (`%`s ficam em env var; custos manuais são lançados via Supabase dashboard).
- Form de "lançar venda manual" no painel.
- Redesenho da home (`/`) ou das páginas existentes.
- Substituir ou unificar o "Alunos" (lista/CRUD) existente — o novo Dashboard > Alunos é uma página separada, focada em métricas.

## 3. Decisões-chave

| # | Decisão | Motivo |
|---|---------|--------|
| 1 | Sidebar ganha item expansível "Dashboard" (▾) com Vendas/Alunos como filhos | Mantém a sidebar existente intacta; novo item se auto-expande quando a rota é `/dashboard/*` |
| 2 | Dashboard > Alunos é página NOVA de métricas | O `/alunos` solto continua sendo lista/CRUD; coexistem 2 entradas "Alunos" no menu por design |
| 3 | Estado do seletor de período via URL params (`?from=&to=`) | Links compartilháveis, SSR funciona, back/forward respeita |
| 4 | Imposto% e Plataforma% via env var (defaults 6,0% e 9,9%) | Evita UI de config nesta fase; valores raramente mudam |
| 5 | Custos manuais em tabela própria, sem UI ainda | Tabela já fica criada e usada na fórmula; lançamento via Supabase até Fase 2 |
| 6 | Resultado vem de `orders` table; Hotmart popula em Fase 2 | Página sobe com fórmulas corretas e Resultado em R$ 0 até dados chegarem |
| 7 | "Progressão na aula atual" e "Taxa de conclusão" dependem de `activities.metadata` carregar `course_id`/`lesson_id` | Caveat documentado; se metadata estiver vazio hoje, métricas retornam 0 e a normalização do tracking entra como follow-up |
| 8 | "Taxa de conclusão" é derivada (sem event `course_completed`) | App hoje só emite `lesson_completed`; conclusão = aluno completou TODAS as lessons de algum curso (computado via join `courses → modules → lessons`) |

## 4. Estrutura de arquivos

```
app/(dashboard)/dashboard/
├── layout.tsx              (wrapper com <PeriodSelector />)
├── vendas/page.tsx
└── alunos/page.tsx

components/
├── period-selector.tsx     (presets 7d/30d/90d/Mês + date pickers; lê/escreve URL params)
├── stat-card.tsx           (variante flexível do metric-card)
├── distribution-donut.tsx  (Recharts <PieChart innerRadius>)
└── activity-heatmap.tsx    (grid 7×~5, 30 dias)

lib/dashboard/
├── types.ts                (Period, VendasMetrics, AlunosMetrics, DistribuicaoCurso, HeatmapDay)
├── period.ts               (parsePeriodFromSearchParams, presetToRange, formatRange)
├── vendas.ts               (getVendasMetrics)
└── alunos.ts               (getAlunosMetrics)

components/sidebar.tsx       (modificado — items aninhados + estado expandido)
supabase/schema.sql          (+ tabela manual_costs)
.env.example                 (+ DASHBOARD_IMPOSTO_PCT, DASHBOARD_PLATAFORMA_PCT)
```

## 5. Rotas

| Rota | Componente | O que renderiza |
|------|-----------|-----------------|
| `/dashboard` | redireciona pra `/dashboard/vendas` | — |
| `/dashboard/vendas` | `app/(dashboard)/dashboard/vendas/page.tsx` | 6 cards 3×2 + 1 destaque Lucro Real |
| `/dashboard/alunos` | `app/(dashboard)/dashboard/alunos/page.tsx` | 6 cards 3×2 + 2 visualizações (donut + heatmap) |

`/dashboard/layout.tsx` envolve as duas páginas com o seletor de período (lê `searchParams.from` e `searchParams.to` e injeta nas pages como prop `period`).

Caching: cada page exporta `export const revalidate = 300` (5 min) — alinhado com o padrão da home.

## 6. Sidebar — item expansível

`components/sidebar.tsx` passa a aceitar dois tipos de entrada:

```ts
type NavItem =
  | { type: "link"; href: string; label: string; icon: LucideIcon }
  | { type: "group"; id: string; label: string; icon: LucideIcon; children: NavLink[] };

type NavLink = { href: string; label: string };
```

Estado:
- `openGroups` (Set<string>) controlado por `useState`
- Inicializado com `new Set(["dashboard"])` se `pathname.startsWith("/dashboard")`, senão `new Set()`
- Click no header do grupo alterna o id no Set

Render:
- Item do grupo tem chevron à direita (`▾` quando aberto, `▸` quando fechado)
- Children aparecem indentados ~24px, fonte um pouco menor que o pai, mesma cor (`text-ink-200`)
- "Ativo" (rota bate) usa `text-accent-gold bg-brand-800` — mesmo padrão dos outros itens

Lista final (ordem na sidebar):

1. Início
2. **Dashboard** (group)
   - Vendas
   - Alunos
3. Área de membros
4. Tráfego pago
5. Concorrentes
6. Alunos *(existente, intocado)*
7. Automações

## 7. Seletor de período

Componente `<PeriodSelector />` (client component):

- Presets: 7d, 30d, 90d, Mês atual, Custom
- Custom abre dois date inputs (de / até)
- Default quando URL sem params: 30d (preset "30d" marcado)
- Click em preset:
  - calcula `from`/`until` (`since` é ISO date "YYYY-MM-DD")
  - chama `router.push("?from=...&to=...", { scroll: false })`
- URL params são a fonte da verdade; o componente lê via `useSearchParams`
- Lê tanto `from`/`to` quanto `period=30d` para suportar links curtos (`?period=30d`)

Helper `lib/dashboard/period.ts`:

```ts
type Period = { from: string; until: string; preset?: "7d"|"30d"|"90d"|"month"|"custom" };
parsePeriod(searchParams: { from?: string; to?: string; period?: string }): Period;
presetToRange(preset: "7d"|"30d"|"90d"|"month"): { from: string; until: string };
formatRange(p: Period): string;  // "12 de abril → 12 de maio de 2026"
```

`/dashboard/layout.tsx` chama `parsePeriod(searchParams)` e injeta nos `page.tsx`.

## 8. Página Vendas

### 8.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│ Vendas                          [7d|30d*|90d|Mês|Custom]│
│ Últimos 30 dias · 12/abr → 12/mai                       │
├──────────────┬──────────────┬──────────────────────────┤
│ Resultado    │ Investimento │ ROAS                     │
│ R$ 84.530    │ R$ 26.310    │ 3,21×                    │
│ [Hotmart]    │ [Meta]       │ Resultado÷Investimento   │
├──────────────┼──────────────┼──────────────────────────┤
│ CPM          │ CPA          │ Imposto                  │
│ R$ 18,42     │ R$ 47,00     │ R$ 5.072 (6%)            │
│ [Meta]       │              │                          │
├──────────────┴──────────────┴──────────────────────────┤
│ Lucro Real                                              │
│ R$ 44.778,73                                            │
│ Resultado − Inv − Imposto − Plataforma − Manuais        │
└─────────────────────────────────────────────────────────┘
```

Tags pequenas `[Hotmart]` e `[Meta]` ao lado do label do card indicam a fonte da métrica.

### 8.2 Fórmula e queries

Todas em `lib/dashboard/vendas.ts`:

```ts
async function getVendasMetrics(period: Period): Promise<VendasMetrics> {
  const supabase = await createClient();
  const [{ data: ordersRows }, ads, { data: costsRows }] = await Promise.all([
    supabase.from("orders").select("amount, status")
      .eq("status", "paid")
      .gte("purchased_at", period.from)
      .lte("purchased_at", period.until),
    fetchMetaAdsMetrics(period.from, period.until),
    supabase.from("manual_costs").select("amount")
      .gte("occurred_at", period.from)
      .lte("occurred_at", period.until)
  ]);

  const resultado = (ordersRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const ordersCount = (ordersRows ?? []).length;

  const impostoPct = Number(process.env.DASHBOARD_IMPOSTO_PCT ?? 6);
  const platPct = Number(process.env.DASHBOARD_PLATAFORMA_PCT ?? 9.9);

  const imposto = resultado * (impostoPct / 100);
  const plataforma = resultado * (platPct / 100);
  const custosManuais = (costsRows ?? []).reduce((s, r) => s + Number(r.amount), 0);

  const investimento = ads.spend;
  const cpm = ads.cpm;
  const cpa = ordersCount > 0 ? investimento / ordersCount : 0;
  const roas = investimento > 0 ? resultado / investimento : 0;
  const lucroReal = resultado - investimento - imposto - plataforma - custosManuais;

  return {
    resultado, investimento, roas, cpm, cpa,
    imposto, impostoPct, plataforma, platPct,
    custosManuais, lucroReal
  };
}
```

Caveats:
- Sem Hotmart, `orders` fica vazio. `resultado=0`, e por consequência `roas`, `cpa`, `imposto`, `plataforma`, `lucroReal` ficam 0 ou negativo (lucro negativo se houver `investimento` no Meta).
- CPM vem direto do Meta; quando `META_ACCESS_TOKEN` não está setado, `fetchMetaAdsMetrics` retorna mock (já é o comportamento atual).

## 9. Página Alunos

### 9.1 Layout

```
┌─────────────────────────────────────────────────────────┐
│ Alunos                          [7d|30d*|90d|Mês|Custom]│
│ Últimos 30 dias · 12/abr → 12/mai                       │
├──────────────┬──────────────┬──────────────────────────┤
│ Ativos       │ Novos        │ Progressão média         │
│ 312          │ +28          │ 63,4%                    │
├──────────────┼──────────────┼──────────────────────────┤
│ Conclusão    │ Churn        │ Tempo até 1ª aula        │
│ 42%          │ 21           │ 2,3 dias                 │
├──────────────┴──────┬───────┴──────────────────────────┤
│ Distribuição/curso  │ Atividade — últimos 30 dias       │
│ (donut Recharts)    │ (heatmap 7×5)                     │
└─────────────────────┴───────────────────────────────────┘
```

### 9.2 Queries

Em `lib/dashboard/alunos.ts`:

```ts
async function getAlunosMetrics(period: Period): Promise<AlunosMetrics> {
  const supabase = await createClient();

  const [
    { count: ativos },
    { count: novos },
    progressao,
    conclusao,
    { count: churn },
    tempoPrimeira,
    distribuicao,
    heatmap
  ] = await Promise.all([
    // Ativos (não usa período)
    supabase.from("students").select("*", { count: "exact", head: true }).eq("status", "active"),
    // Novos no período
    supabase.from("students").select("*", { count: "exact", head: true })
      .gte("enrolled_at", period.from).lte("enrolled_at", period.until),
    // Progressão média (cumulativa — não usa período)
    supabase.rpc("dashboard_progressao_media"),
    // Taxa de conclusão (cumulativa — % alunos que completaram TODAS as lessons de algum curso)
    supabase.rpc("dashboard_taxa_conclusao"),
    // Churn (sempre janela fixa de 30d sem atividade)
    rpcChurn(supabase),
    // Tempo até 1ª aula (usa período — média dos novos do período)
    supabase.rpc("dashboard_tempo_primeira_aula", { p_from: period.from, p_until: period.until }),
    // Distribuição
    supabase.from("students").select("course").eq("status", "active"),
    // Heatmap (sempre 30d, ignora seletor)
    supabase.from("activities")
      .select("occurred_at")
      .gte("occurred_at", isoDate(daysAgo(30)))
  ]);

  return {
    ativos: ativos ?? 0,
    novos: novos ?? 0,
    progressaoMedia: progressao,
    taxaConclusao: conclusao,
    churn: churn ?? 0,
    tempoPrimeiraAula: tempoPrimeira,
    distribuicao: aggregateByCourse(distribuicao.data ?? []),
    heatmap: aggregateByDay(heatmap.data ?? [])
  };
}
```

SQL bruto das 3 queries complexas (definidas como Postgres functions / RPCs em `supabase/schema.sql` para evitar lógica complexa no client):

```sql
-- Progressão média na "aula/curso atual" dos ativos
-- `lessons` é ligada a `modules`, que é ligada a `courses` — join por module
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

-- Taxa de conclusão: % de alunos que completaram TODAS as lessons de pelo menos
-- um curso. Não existe event_type 'course_completed' no app hoje — derivamos.
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

-- Tempo médio até a 1ª aula (em dias) — novos do período
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

(Functions ficam em `supabase/schema.sql` e são aplicadas via `supabase db query --linked -f`.)

Churn fica como query inline (não vale RPC):
```sql
select count(*) from students s
where s.status='churned'
   or not exists (
     select 1 from activities a
     where a.student_id=s.id
       and a.occurred_at > now() - interval '30 days'
   );
```

## 10. Schema novo

```sql
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
```

(Sem UI nesta fase — Dani insere via Supabase Dashboard quando precisar.)

## 11. Variáveis de ambiente

Adicionar ao `.env.example` (e `.env.local`/`.env.production`):

```
DASHBOARD_IMPOSTO_PCT=6.0
DASHBOARD_PLATAFORMA_PCT=9.9
```

Defaults aplicados em `lib/dashboard/vendas.ts` se as variáveis estiverem ausentes.

## 12. Tratamento de erros e estados vazios

- Página Vendas com `orders` vazia: cards mostram `R$ 0` / `0×` normalmente; Lucro Real fica negativo se houver `investimento`. Nenhum estado de erro especial — é o estado esperado da Fase 1.
- Falha no Meta Ads API: `fetchMetaAdsMetrics` já retorna mock zerado quando `META_ACCESS_TOKEN` ausente; cards mostram zeros sem quebrar a página.
- Falha em RPC do Postgres (ex.: function não existe ainda): page mostra `0` no card, sem crash. O `Promise.all` dentro de `getAlunosMetrics` precisa usar `Promise.allSettled` para resiliência.
- Caveat "Progressão média = 0" se `activities.metadata.course_id` não estiver populado: documentar no README de operação como sinal de tracking incompleto.

## 13. Testes (opcional na Fase 1)

Não há suite de testes hoje. Validação manual:
- Aplicar schema no Supabase (`supabase db query --linked -f supabase/schema.sql`)
- Subir dev (`npm run dev`)
- `/dashboard` redireciona pra `/dashboard/vendas`
- Trocar período via URL e botões — métricas e descrição do range atualizam
- Sidebar: "Dashboard" auto-expande em `/dashboard/*`, colapsa em outras rotas
- Inserir um row em `orders` via Supabase Dashboard e ver `Resultado` mudar
- Inserir um row em `manual_costs` e ver `Lucro Real` cair pelo mesmo valor

## 14. Plano de fases

| Fase | Conteúdo | Estado |
|------|----------|--------|
| 1 (este spec) | Sidebar nova, 2 páginas, period selector, queries, schema manual_costs, env vars | Aguardando plano + implementação |
| 2 | Webhook Hotmart + popular `orders` + backfill via API | Spec separado quando Dani tiver acesso à Hotmart |
| 3 (futura) | UI de config (editar %s e CRUD de manual_costs) | Não planejado ainda |

# Tráfego conectado com Meta Ads — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir a integração Meta Ads agregada por uma versão por anúncio, com bucketing perpétuo/lançamento via `campaign.objective`, ranking top 3 por bucket, métricas de vídeo (hook/hold rate) e botão de refresh manual.

**Architecture:** 1 chamada única ao Meta Graph API `/insights?level=ad` com `campaign{objective}` e `creative{thumbnail_url}` expandidos. Cache de 1h via `revalidate` do Next, invalidável por server action. Zero infraestrutura nova: stateless do nosso lado.

**Tech Stack:** Next.js 15 App Router (server components), TypeScript estrito, Vitest pra testes, Meta Graph API v23.0 (mesma versão já usada no projeto).

**Spec:** `docs/superpowers/specs/2026-05-28-trafego-meta-ads-design.md`

---

## File Structure

### Novos arquivos

```
lib/integrations/
├── meta-ads.test.ts                        # unit + integration tests
└── meta-ads-fixtures.ts                    # JSON fixture do Meta para testes

app/(dashboard)/trafego/
└── actions.ts                              # server action refreshMetaAds

docs/META_SETUP.md                          # guia de setup pra Dani
vitest.config.ts                            # config do test runner
```

### Modificados

```
lib/integrations/meta-ads.ts                # reescrita completa
app/(dashboard)/trafego/page.tsx            # de mockup → fetch real
app/(dashboard)/trafego/_components/ad-card.tsx       # aceita thumbnailUrl + fallback
app/(dashboard)/trafego/_components/bucket-section.tsx # sync de types
app/(dashboard)/trafego/_components/refresh-button.tsx # chama server action real
package.json                                # +scripts test, +deps vitest
```

### Responsabilidades

- `meta-ads.ts` contém **toda** a lógica: tipos, fetch, paging, parsing, bucketing, ranking, aggregation. Funções puras testáveis + um orchestrator `fetchTrafegoData`.
- `page.tsx` apenas consome a função e mapeia pro componente.
- `actions.ts` apenas chama `revalidatePath`.
- Componentes em `_components/` são apresentação pura.

---

## Task 1: Setup Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Install Vitest e dependências**

Run:
```bash
npm install -D vitest @vitest/ui
```

Expected output: `added N packages`. Sem warnings de peer deps quebrados.

- [ ] **Step 2: Criar `vitest.config.ts`**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    include: ["**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, ".")
    }
  }
});
```

- [ ] **Step 3: Adicionar scripts em `package.json`**

Modify `package.json` adicionando no objeto `scripts`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 4: Smoke test do runner**

Run: `npm test`
Expected: `No test files found`. Exit code 0 (ou 1 sem erro, dependendo da versão). O importante é não estourar erro de config.

- [ ] **Step 5: Commit**

```bash
git add vitest.config.ts package.json package-lock.json
git commit -m "chore: add vitest test runner"
```

---

## Task 2: Tipos e `assignBucket`

**Files:**
- Modify: `lib/integrations/meta-ads.ts` (mantém função antiga, adiciona tipos novos)
- Create: `lib/integrations/meta-ads.test.ts`

- [ ] **Step 1: Adicionar tipos no topo de `lib/integrations/meta-ads.ts`**

Adicionar no início do arquivo (depois do comentário de docs existente, antes do `export type TrafficMetrics`):

```ts
export type Bucket = "perpetuo" | "lancamento" | "outros";

export type AdFormat = "video" | "image" | "unknown";

export type AdMetrics = {
  id: string;
  name: string;
  campaign: { id: string; name: string; objective: string; bucket: Bucket };
  format: AdFormat;
  spend: number;
  impressions: number;
  clicks: number;
  cpc: number;
  ctr: number;
  cpm: number;
  purchases: number;
  leads: number;
  costPerPurchase: number | null;
  costPerLead: number | null;
  hookRate: number | null;
  holdRate: number | null;
  thumbnailUrl: string | null;
};

export type AggregateMetrics = {
  spend: number;
  impressions: number;
  clicks: number;
  cpm: number;
  ctr: number;
  cpc: number;
  conversions: number;
  revenue: number;
  roas: number;
};

export type BucketSummary = {
  bucket: Bucket;
  ads: AdMetrics[];
  totalSpend: number;
  totalResults: number;
  avgCostPerResult: number;
};

export type TrafegoFetchError = {
  code: string;
  message: string;
};

export type TrafegoData = {
  aggregate: AggregateMetrics;
  perpetuo: BucketSummary;
  lancamento: BucketSummary;
  outros: BucketSummary;
  fetchedAt: string;
  source: "meta" | "mock";
  errors: TrafegoFetchError[];
};
```

- [ ] **Step 2: Escrever teste falho pra `assignBucket`**

Create `lib/integrations/meta-ads.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { assignBucket } from "./meta-ads";

describe("assignBucket", () => {
  it("mapeia OUTCOME_SALES para perpetuo", () => {
    expect(assignBucket("OUTCOME_SALES")).toBe("perpetuo");
  });

  it("mapeia CONVERSIONS (legacy) para perpetuo", () => {
    expect(assignBucket("CONVERSIONS")).toBe("perpetuo");
  });

  it("mapeia PRODUCT_CATALOG_SALES (legacy) para perpetuo", () => {
    expect(assignBucket("PRODUCT_CATALOG_SALES")).toBe("perpetuo");
  });

  it("mapeia OUTCOME_LEADS para lancamento", () => {
    expect(assignBucket("OUTCOME_LEADS")).toBe("lancamento");
  });

  it("mapeia LEAD_GENERATION (legacy) para lancamento", () => {
    expect(assignBucket("LEAD_GENERATION")).toBe("lancamento");
  });

  it("mapeia MESSAGES para lancamento", () => {
    expect(assignBucket("MESSAGES")).toBe("lancamento");
  });

  it("mapeia objetivos de awareness/traffic para outros", () => {
    expect(assignBucket("OUTCOME_TRAFFIC")).toBe("outros");
    expect(assignBucket("TRAFFIC")).toBe("outros");
    expect(assignBucket("REACH")).toBe("outros");
    expect(assignBucket("ENGAGEMENT")).toBe("outros");
    expect(assignBucket("OUTCOME_AWARENESS")).toBe("outros");
  });

  it("mapeia objetivos desconhecidos para outros", () => {
    expect(assignBucket("ALGO_NOVO")).toBe("outros");
    expect(assignBucket("")).toBe("outros");
  });
});
```

- [ ] **Step 3: Rodar teste pra confirmar que falha**

Run: `npm test -- meta-ads.test.ts`
Expected: FAIL com erro tipo `SyntaxError: The requested module './meta-ads' does not provide an export named 'assignBucket'`.

- [ ] **Step 4: Implementar `assignBucket` em `lib/integrations/meta-ads.ts`**

Adicionar no fim do arquivo:

```ts
const PERPETUO_OBJECTIVES = new Set([
  "OUTCOME_SALES",
  "CONVERSIONS",
  "PRODUCT_CATALOG_SALES"
]);

const LANCAMENTO_OBJECTIVES = new Set([
  "OUTCOME_LEADS",
  "LEAD_GENERATION",
  "MESSAGES"
]);

export function assignBucket(objective: string): Bucket {
  if (PERPETUO_OBJECTIVES.has(objective)) return "perpetuo";
  if (LANCAMENTO_OBJECTIVES.has(objective)) return "lancamento";
  return "outros";
}
```

- [ ] **Step 5: Rodar teste pra confirmar que passa**

Run: `npm test -- meta-ads.test.ts`
Expected: PASS, 8 testes verdes.

- [ ] **Step 6: Commit**

```bash
git add lib/integrations/meta-ads.ts lib/integrations/meta-ads.test.ts
git commit -m "feat(meta-ads): add types and assignBucket"
```

---

## Task 3: `parseAdInsight` — derivar AdMetrics do payload Meta

**Files:**
- Modify: `lib/integrations/meta-ads.ts`
- Modify: `lib/integrations/meta-ads.test.ts`
- Create: `lib/integrations/meta-ads-fixtures.ts`

- [ ] **Step 1: Criar fixture com payload realista da Meta**

Create `lib/integrations/meta-ads-fixtures.ts`:

```ts
// Payload inspirado em /act_X/insights?level=ad&fields=...,campaign{objective},creative{thumbnail_url}
// Estrutura conforme docs da Meta Graph API v23.0.

export const VIDEO_AD_INSIGHT = {
  ad_id: "120201234567890",
  ad_name: "VSL Risotos | Versão 3",
  campaign_id: "120209999000000",
  campaign: {
    id: "120209999000000",
    name: "PERP · Vendas Curso Risotos",
    objective: "OUTCOME_SALES"
  },
  creative: {
    thumbnail_url: "https://scontent.facebook.com/thumb/abc.jpg",
    video_id: "987654321"
  },
  spend: "2341.50",
  impressions: "184230",
  clicks: "5712",
  cpc: "0.41",
  ctr: "3.1",
  cpm: "12.71",
  actions: [
    { action_type: "purchase", value: "78" },
    { action_type: "link_click", value: "5300" }
  ],
  cost_per_action_type: [
    { action_type: "purchase", value: "30.02" }
  ],
  action_values: [
    { action_type: "purchase", value: "11700.00" }
  ],
  video_play_actions: [{ action_type: "video_view", value: "120000" }],
  video_3_sec_watched_actions: [{ action_type: "video_view", value: "77610" }],
  video_thruplay_watched_actions: [{ action_type: "video_view", value: "53093" }]
};

export const STATIC_AD_INSIGHT = {
  ad_id: "120201111111111",
  ad_name: "Carousel Receitas",
  campaign_id: "120209999000001",
  campaign: {
    id: "120209999000001",
    name: "PERP · Vendas Catalogo",
    objective: "OUTCOME_SALES"
  },
  creative: {
    image_url: "https://scontent.facebook.com/img/xyz.jpg"
  },
  spend: "1872.40",
  impressions: "115400",
  clicks: "3232",
  cpc: "0.58",
  ctr: "2.8",
  cpm: "16.22",
  actions: [{ action_type: "purchase", value: "51" }],
  cost_per_action_type: [{ action_type: "purchase", value: "36.71" }],
  action_values: [{ action_type: "purchase", value: "7650.00" }]
};

export const LEAD_AD_INSIGHT = {
  ad_id: "120203333333333",
  ad_name: "Lead Magnet PDF",
  campaign_id: "120209999000002",
  campaign: {
    id: "120209999000002",
    name: "LANC · Maio Captacao",
    objective: "OUTCOME_LEADS"
  },
  creative: { image_url: "https://scontent.facebook.com/img/lead.jpg" },
  spend: "920.40",
  impressions: "67500",
  clicks: "2565",
  cpc: "0.36",
  ctr: "3.8",
  cpm: "13.64",
  actions: [
    { action_type: "lead", value: "100" },
    { action_type: "complete_registration", value: "42" }
  ],
  cost_per_action_type: [
    { action_type: "lead", value: "9.20" },
    { action_type: "complete_registration", value: "21.91" }
  ]
};
```

- [ ] **Step 2: Escrever testes falhos pra `parseAdInsight`**

Adicionar em `lib/integrations/meta-ads.test.ts`:

```ts
import { parseAdInsight } from "./meta-ads";
import {
  VIDEO_AD_INSIGHT,
  STATIC_AD_INSIGHT,
  LEAD_AD_INSIGHT
} from "./meta-ads-fixtures";

describe("parseAdInsight", () => {
  it("extrai metricas basicas e bucket perpetuo de video", () => {
    const ad = parseAdInsight(VIDEO_AD_INSIGHT);
    expect(ad.id).toBe("120201234567890");
    expect(ad.name).toBe("VSL Risotos | Versão 3");
    expect(ad.campaign.bucket).toBe("perpetuo");
    expect(ad.campaign.objective).toBe("OUTCOME_SALES");
    expect(ad.format).toBe("video");
    expect(ad.spend).toBe(2341.5);
    expect(ad.impressions).toBe(184230);
    expect(ad.clicks).toBe(5712);
    expect(ad.purchases).toBe(78);
    expect(ad.leads).toBe(0);
    expect(ad.costPerPurchase).toBe(30.02);
    expect(ad.costPerLead).toBeNull();
    expect(ad.thumbnailUrl).toBe("https://scontent.facebook.com/thumb/abc.jpg");
  });

  it("calcula hook rate e hold rate pra video", () => {
    const ad = parseAdInsight(VIDEO_AD_INSIGHT);
    // hook = 77610 / 184230 * 100 = 42.13...
    expect(ad.hookRate).toBeCloseTo(42.13, 1);
    // hold = 53093 / 77610 * 100 = 68.41...
    expect(ad.holdRate).toBeCloseTo(68.41, 1);
  });

  it("formato image nao tem hook/hold (null)", () => {
    const ad = parseAdInsight(STATIC_AD_INSIGHT);
    expect(ad.format).toBe("image");
    expect(ad.hookRate).toBeNull();
    expect(ad.holdRate).toBeNull();
    expect(ad.thumbnailUrl).toBe("https://scontent.facebook.com/img/xyz.jpg");
  });

  it("soma leads de multiplos action_types (lead + complete_registration)", () => {
    const ad = parseAdInsight(LEAD_AD_INSIGHT);
    expect(ad.campaign.bucket).toBe("lancamento");
    expect(ad.leads).toBe(142); // 100 + 42
    // costPerLead = spend / leads = 920.40 / 142 = 6.48
    expect(ad.costPerLead).toBeCloseTo(6.48, 2);
    expect(ad.purchases).toBe(0);
    expect(ad.costPerPurchase).toBeNull();
  });

  it("retorna 0/null quando actions ausente", () => {
    const ad = parseAdInsight({
      ...STATIC_AD_INSIGHT,
      actions: undefined,
      cost_per_action_type: undefined
    });
    expect(ad.purchases).toBe(0);
    expect(ad.leads).toBe(0);
    expect(ad.costPerPurchase).toBeNull();
    expect(ad.costPerLead).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar pra confirmar falha**

Run: `npm test -- meta-ads.test.ts`
Expected: testes de `parseAdInsight` falham com erro `parseAdInsight is not a function` (ou import error). Os de `assignBucket` continuam passando.

- [ ] **Step 4: Implementar `parseAdInsight`**

Adicionar em `lib/integrations/meta-ads.ts`:

```ts
type RawAction = { action_type: string; value: string };
type RawInsight = {
  ad_id: string;
  ad_name: string;
  campaign_id: string;
  campaign?: { id: string; name: string; objective: string };
  creative?: { thumbnail_url?: string; image_url?: string; video_id?: string };
  spend?: string;
  impressions?: string;
  clicks?: string;
  cpc?: string;
  ctr?: string;
  cpm?: string;
  actions?: RawAction[];
  cost_per_action_type?: RawAction[];
  action_values?: RawAction[];
  video_play_actions?: RawAction[];
  video_3_sec_watched_actions?: RawAction[];
  video_thruplay_watched_actions?: RawAction[];
};

const LEAD_ACTION_TYPES = new Set([
  "lead",
  "complete_registration",
  "submit_application",
  "onsite_conversion.lead_grouped"
]);

function num(v: string | undefined): number {
  return v == null ? 0 : Number(v) || 0;
}

function actionsSum(actions: RawAction[] | undefined, types: Set<string> | string): number {
  if (!actions) return 0;
  const match = typeof types === "string"
    ? (t: string) => t === types
    : (t: string) => types.has(t);
  return actions.filter((a) => match(a.action_type)).reduce((s, a) => s + num(a.value), 0);
}

function actionValue(actions: RawAction[] | undefined, type: string): number | null {
  if (!actions) return null;
  const found = actions.find((a) => a.action_type === type);
  return found ? num(found.value) : null;
}

function inferFormat(raw: RawInsight): AdFormat {
  if (raw.creative?.video_id || raw.video_play_actions?.length) return "video";
  if (raw.creative?.image_url || raw.creative?.thumbnail_url) return "image";
  return "unknown";
}

function thumbnailUrl(raw: RawInsight): string | null {
  return raw.creative?.thumbnail_url ?? raw.creative?.image_url ?? null;
}

export function parseAdInsight(raw: RawInsight): AdMetrics {
  const spend = num(raw.spend);
  const impressions = num(raw.impressions);
  const format = inferFormat(raw);

  const purchases = actionsSum(raw.actions, "purchase");
  const leads = actionsSum(raw.actions, LEAD_ACTION_TYPES);

  // Custo por purchase: usar cost_per_action_type se a Meta retornou,
  // caso contrário derivar spend/purchases.
  const costPerPurchaseMeta = actionValue(raw.cost_per_action_type, "purchase");
  const costPerPurchase = costPerPurchaseMeta ?? (purchases > 0 ? spend / purchases : null);

  // Custo por lead: como pode somar varios action_types, derivamos sempre de spend/leads
  // para garantir consistencia com o que a UI vai mostrar.
  const costPerLead = leads > 0 ? spend / leads : null;

  const v3s = actionValue(raw.video_3_sec_watched_actions, "video_view") ?? 0;
  const vThru = actionValue(raw.video_thruplay_watched_actions, "video_view") ?? 0;
  const hookRate = format === "video" && impressions > 0 ? (v3s / impressions) * 100 : null;
  const holdRate = format === "video" && v3s > 0 ? (vThru / v3s) * 100 : null;

  const campaignObjective = raw.campaign?.objective ?? "";

  return {
    id: raw.ad_id,
    name: raw.ad_name,
    campaign: {
      id: raw.campaign?.id ?? raw.campaign_id,
      name: raw.campaign?.name ?? "(sem nome)",
      objective: campaignObjective,
      bucket: assignBucket(campaignObjective)
    },
    format,
    spend,
    impressions,
    clicks: num(raw.clicks),
    cpc: num(raw.cpc),
    ctr: num(raw.ctr),
    cpm: num(raw.cpm),
    purchases,
    leads,
    costPerPurchase,
    costPerLead,
    hookRate,
    holdRate,
    thumbnailUrl: thumbnailUrl(raw)
  };
}
```

- [ ] **Step 5: Rodar testes**

Run: `npm test -- meta-ads.test.ts`
Expected: PASS, todos os testes (assignBucket + parseAdInsight) verdes.

- [ ] **Step 6: Commit**

```bash
git add lib/integrations/meta-ads.ts lib/integrations/meta-ads.test.ts lib/integrations/meta-ads-fixtures.ts
git commit -m "feat(meta-ads): parse raw ad insight into AdMetrics"
```

---

## Task 4: `rankAdsInBucket`

**Files:**
- Modify: `lib/integrations/meta-ads.ts`
- Modify: `lib/integrations/meta-ads.test.ts`

- [ ] **Step 1: Escrever testes falhos**

Adicionar em `lib/integrations/meta-ads.test.ts`:

```ts
import { rankAdsInBucket } from "./meta-ads";
import type { AdMetrics } from "./meta-ads";

function makeAd(over: Partial<AdMetrics>): AdMetrics {
  return {
    id: "x",
    name: "x",
    campaign: { id: "c", name: "c", objective: "OUTCOME_SALES", bucket: "perpetuo" },
    format: "image",
    spend: 0,
    impressions: 0,
    clicks: 0,
    cpc: 0,
    ctr: 0,
    cpm: 0,
    purchases: 0,
    leads: 0,
    costPerPurchase: null,
    costPerLead: null,
    hookRate: null,
    holdRate: null,
    thumbnailUrl: null,
    ...over
  };
}

describe("rankAdsInBucket", () => {
  it("perpetuo: ordena por menor custo/purchase com >=3 compras", () => {
    const ads = [
      makeAd({ id: "a", purchases: 10, costPerPurchase: 25 }),
      makeAd({ id: "b", purchases: 5, costPerPurchase: 15 }),
      makeAd({ id: "c", purchases: 4, costPerPurchase: 40 }),
      makeAd({ id: "d", purchases: 2, costPerPurchase: 10 }) // filtrado: <3 compras
    ];
    const ranked = rankAdsInBucket(ads, "perpetuo");
    expect(ranked.map((a) => a.id)).toEqual(["b", "a", "c"]);
  });

  it("perpetuo: completa com maior spend quando falta candidato qualificado", () => {
    const ads = [
      makeAd({ id: "a", purchases: 5, costPerPurchase: 20, spend: 100 }),
      makeAd({ id: "b", purchases: 1, costPerPurchase: 10, spend: 500 }),
      makeAd({ id: "c", purchases: 0, spend: 300 })
    ];
    const ranked = rankAdsInBucket(ads, "perpetuo");
    expect(ranked.map((a) => a.id)).toEqual(["a", "b", "c"]);
  });

  it("lancamento: ordena por menor custo/lead com >=5 leads", () => {
    const ads = [
      makeAd({ id: "a", purchases: 0, leads: 100, costPerLead: 9, campaign: { id: "c", name: "c", objective: "OUTCOME_LEADS", bucket: "lancamento" } }),
      makeAd({ id: "b", purchases: 0, leads: 200, costPerLead: 6, campaign: { id: "c", name: "c", objective: "OUTCOME_LEADS", bucket: "lancamento" } }),
      makeAd({ id: "c", purchases: 0, leads: 3, costPerLead: 3, campaign: { id: "c", name: "c", objective: "OUTCOME_LEADS", bucket: "lancamento" } })
    ];
    const ranked = rankAdsInBucket(ads, "lancamento");
    expect(ranked.map((a) => a.id)).toEqual(["b", "a", "c"]);
  });

  it("retorna ate 3 itens", () => {
    const ads = [
      makeAd({ id: "a", purchases: 10, costPerPurchase: 10 }),
      makeAd({ id: "b", purchases: 10, costPerPurchase: 20 }),
      makeAd({ id: "c", purchases: 10, costPerPurchase: 30 }),
      makeAd({ id: "d", purchases: 10, costPerPurchase: 40 })
    ];
    expect(rankAdsInBucket(ads, "perpetuo").length).toBe(3);
  });

  it("lista vazia retorna array vazio", () => {
    expect(rankAdsInBucket([], "perpetuo")).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar pra confirmar falha**

Run: `npm test -- meta-ads.test.ts`
Expected: testes de `rankAdsInBucket` falham com `is not a function`.

- [ ] **Step 3: Implementar `rankAdsInBucket`**

Adicionar em `lib/integrations/meta-ads.ts`:

```ts
const MIN_PURCHASES = 3;
const MIN_LEADS = 5;
const TOP_N = 3;

export function rankAdsInBucket(
  ads: AdMetrics[],
  bucket: "perpetuo" | "lancamento"
): AdMetrics[] {
  const minCount = bucket === "perpetuo" ? MIN_PURCHASES : MIN_LEADS;
  const getCount = (a: AdMetrics) => (bucket === "perpetuo" ? a.purchases : a.leads);
  const getCost = (a: AdMetrics) =>
    bucket === "perpetuo" ? a.costPerPurchase : a.costPerLead;

  const qualified = ads.filter((a) => getCount(a) >= minCount && getCost(a) != null);
  const rest = ads.filter((a) => !qualified.includes(a));

  qualified.sort((x, y) => {
    const cx = getCost(x)!;
    const cy = getCost(y)!;
    if (cx !== cy) return cx - cy;
    return y.spend - x.spend; // empate: maior spend
  });

  rest.sort((x, y) => y.spend - x.spend);

  return [...qualified, ...rest].slice(0, TOP_N);
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- meta-ads.test.ts`
Expected: PASS, todos verdes.

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/meta-ads.ts lib/integrations/meta-ads.test.ts
git commit -m "feat(meta-ads): rank ads within bucket"
```

---

## Task 5: Agregadores

**Files:**
- Modify: `lib/integrations/meta-ads.ts`
- Modify: `lib/integrations/meta-ads.test.ts`

- [ ] **Step 1: Escrever testes**

Adicionar em `lib/integrations/meta-ads.test.ts`:

```ts
import { aggregateBucket, aggregateAccount } from "./meta-ads";

describe("aggregateBucket", () => {
  it("soma spend, results e calcula custo medio (perpetuo usa purchases)", () => {
    const ads = [
      makeAd({ id: "a", spend: 100, purchases: 5 }),
      makeAd({ id: "b", spend: 200, purchases: 10 })
    ];
    const summary = aggregateBucket(ads, "perpetuo");
    expect(summary.bucket).toBe("perpetuo");
    expect(summary.totalSpend).toBe(300);
    expect(summary.totalResults).toBe(15);
    expect(summary.avgCostPerResult).toBe(20);
  });

  it("lancamento usa leads como contagem", () => {
    const ads = [
      makeAd({
        id: "a", spend: 100, leads: 20,
        campaign: { id: "c", name: "c", objective: "OUTCOME_LEADS", bucket: "lancamento" }
      })
    ];
    const summary = aggregateBucket(ads, "lancamento");
    expect(summary.totalResults).toBe(20);
    expect(summary.avgCostPerResult).toBe(5);
  });

  it("avgCostPerResult e 0 quando totalResults e 0", () => {
    const summary = aggregateBucket([], "perpetuo");
    expect(summary.totalSpend).toBe(0);
    expect(summary.totalResults).toBe(0);
    expect(summary.avgCostPerResult).toBe(0);
  });
});

describe("aggregateAccount", () => {
  it("agrega todos os ads do periodo", () => {
    const ads = [
      makeAd({ id: "a", spend: 100, impressions: 10000, clicks: 200, purchases: 5 }),
      makeAd({ id: "b", spend: 200, impressions: 20000, clicks: 600, leads: 10 })
    ];
    const agg = aggregateAccount(ads);
    expect(agg.spend).toBe(300);
    expect(agg.impressions).toBe(30000);
    expect(agg.clicks).toBe(800);
    expect(agg.conversions).toBe(15); // purchases + leads
    expect(agg.cpm).toBeCloseTo((300 / 30000) * 1000, 2); // 10
    expect(agg.ctr).toBeCloseTo((800 / 30000) * 100, 2); // 2.67
    expect(agg.cpc).toBeCloseTo(300 / 800, 2); // 0.375
  });
});
```

- [ ] **Step 2: Rodar pra confirmar falha**

Run: `npm test -- meta-ads.test.ts`
Expected: testes de aggregate falham com `is not a function`.

- [ ] **Step 3: Implementar agregadores**

Adicionar em `lib/integrations/meta-ads.ts`:

```ts
export function aggregateBucket(ads: AdMetrics[], bucket: Bucket): BucketSummary {
  const totalSpend = ads.reduce((s, a) => s + a.spend, 0);
  const totalResults = ads.reduce((s, a) => {
    if (bucket === "perpetuo") return s + a.purchases;
    if (bucket === "lancamento") return s + a.leads;
    return s + a.clicks; // "outros": usa cliques como proxy
  }, 0);
  const rankedAds = bucket === "outros"
    ? [...ads].sort((x, y) => y.spend - x.spend).slice(0, 3)
    : rankAdsInBucket(ads, bucket);
  return {
    bucket,
    ads: rankedAds,
    totalSpend,
    totalResults,
    avgCostPerResult: totalResults > 0 ? totalSpend / totalResults : 0
  };
}

export function aggregateAccount(ads: AdMetrics[]): AggregateMetrics {
  const spend = ads.reduce((s, a) => s + a.spend, 0);
  const impressions = ads.reduce((s, a) => s + a.impressions, 0);
  const clicks = ads.reduce((s, a) => s + a.clicks, 0);
  const purchases = ads.reduce((s, a) => s + a.purchases, 0);
  const leads = ads.reduce((s, a) => s + a.leads, 0);

  return {
    spend,
    impressions,
    clicks,
    conversions: purchases + leads,
    revenue: 0, // setado em fetchTrafegoData a partir de action_values
    cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
    ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
    cpc: clicks > 0 ? spend / clicks : 0,
    roas: 0 // setado quando revenue chegar
  };
}
```

- [ ] **Step 4: Rodar testes**

Run: `npm test -- meta-ads.test.ts`
Expected: todos verdes.

- [ ] **Step 5: Commit**

```bash
git add lib/integrations/meta-ads.ts lib/integrations/meta-ads.test.ts
git commit -m "feat(meta-ads): bucket and account aggregators"
```

---

## Task 6: `fetchTrafegoData` orchestrator

**Files:**
- Modify: `lib/integrations/meta-ads.ts`
- Modify: `lib/integrations/meta-ads.test.ts`

- [ ] **Step 1: Escrever teste com fetch mockado**

Adicionar em `lib/integrations/meta-ads.test.ts`:

```ts
import { fetchTrafegoData } from "./meta-ads";

describe("fetchTrafegoData", () => {
  function mockFetch(payloads: object[]): typeof fetch {
    let call = 0;
    return ((async () => {
      const body = payloads[call++] ?? payloads[payloads.length - 1];
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }) as unknown) as typeof fetch;
  }

  it("retorna mock quando sem token", async () => {
    const data = await fetchTrafegoData({
      since: "2026-05-01",
      until: "2026-05-28",
      token: undefined,
      accountId: undefined,
      fetchImpl: globalThis.fetch
    });
    expect(data.source).toBe("mock");
    expect(data.aggregate.spend).toBeGreaterThan(0);
    expect(data.perpetuo.ads.length).toBeGreaterThan(0);
  });

  it("fetcha, parseia e agrega quando token presente", async () => {
    const fetchImpl = mockFetch([
      {
        data: [VIDEO_AD_INSIGHT, STATIC_AD_INSIGHT, LEAD_AD_INSIGHT],
        paging: {}
      }
    ]);
    const data = await fetchTrafegoData({
      since: "2026-05-01",
      until: "2026-05-28",
      token: "TOK",
      accountId: "1234",
      fetchImpl
    });
    expect(data.source).toBe("meta");
    expect(data.errors).toEqual([]);
    expect(data.aggregate.spend).toBeCloseTo(2341.5 + 1872.4 + 920.4, 2);
    expect(data.perpetuo.ads.length).toBe(2);
    expect(data.lancamento.ads.length).toBe(1);
  });

  it("retorna mock + errors quando token invalido (190)", async () => {
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({ error: { code: 190, message: "Token expired" } }),
        { status: 401 }
      )) as unknown as typeof fetch;
    const data = await fetchTrafegoData({
      since: "2026-05-01",
      until: "2026-05-28",
      token: "BAD",
      accountId: "1234",
      fetchImpl
    });
    expect(data.source).toBe("mock");
    expect(data.errors[0].code).toBe("190");
  });

  it("pagina ate fim quando paging.next presente", async () => {
    const fetchImpl = mockFetch([
      {
        data: [VIDEO_AD_INSIGHT],
        paging: { next: "https://graph.facebook.com/page2" }
      },
      { data: [LEAD_AD_INSIGHT], paging: {} }
    ]);
    const data = await fetchTrafegoData({
      since: "2026-05-01",
      until: "2026-05-28",
      token: "TOK",
      accountId: "1234",
      fetchImpl
    });
    expect(data.perpetuo.ads.length + data.lancamento.ads.length).toBe(2);
  });
});
```

- [ ] **Step 2: Rodar pra confirmar falha**

Run: `npm test -- meta-ads.test.ts`
Expected: testes falham com `fetchTrafegoData is not a function`.

- [ ] **Step 3: Implementar `fetchTrafegoData`**

Adicionar em `lib/integrations/meta-ads.ts`:

```ts
const META_API_VERSION = "v23.0";

type FetchTrafegoOptions = {
  since: string;
  until: string;
  token: string | undefined;
  accountId: string | undefined;
  fetchImpl?: typeof fetch;
};

const INSIGHT_FIELDS = [
  "ad_id",
  "ad_name",
  "campaign_id",
  "campaign{id,name,objective}",
  "creative{thumbnail_url,image_url,video_id}",
  "spend",
  "impressions",
  "clicks",
  "cpc",
  "ctr",
  "cpm",
  "actions",
  "cost_per_action_type",
  "action_values",
  "video_play_actions",
  "video_3_sec_watched_actions",
  "video_thruplay_watched_actions"
].join(",");

export async function fetchTrafegoData(
  opts: FetchTrafegoOptions
): Promise<TrafegoData> {
  const { since, until, token, accountId } = opts;
  const fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  const fetchedAt = new Date().toISOString();

  if (!token || !accountId) {
    return { ...mockTrafegoData(), fetchedAt, source: "mock", errors: [] };
  }

  const errors: TrafegoFetchError[] = [];
  const ads: AdMetrics[] = [];
  let revenue = 0;

  const firstUrl =
    `https://graph.facebook.com/${META_API_VERSION}/act_${accountId}/insights` +
    `?level=ad&limit=500` +
    `&fields=${encodeURIComponent(INSIGHT_FIELDS)}` +
    `&time_range=${encodeURIComponent(JSON.stringify({ since, until }))}` +
    `&access_token=${encodeURIComponent(token)}`;

  let nextUrl: string | null = firstUrl;
  while (nextUrl) {
    let res: Response;
    try {
      res = await fetchImpl(nextUrl, { next: { revalidate: 3600 } });
    } catch (err) {
      errors.push({ code: "network", message: String(err) });
      break;
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const code = String(body?.error?.code ?? res.status);
      const message = String(body?.error?.message ?? `HTTP ${res.status}`);
      errors.push({ code, message });
      break;
    }

    const json = (await res.json()) as {
      data: RawInsight[];
      paging?: { next?: string };
    };

    for (const raw of json.data ?? []) {
      const ad = parseAdInsight(raw);
      ads.push(ad);
      revenue += Number(
        raw.action_values?.find((a) => a.action_type === "purchase")?.value ?? 0
      );
    }
    nextUrl = json.paging?.next ?? null;
  }

  if (errors.length > 0 && ads.length === 0) {
    return { ...mockTrafegoData(), fetchedAt, source: "mock", errors };
  }

  const aggregate = aggregateAccount(ads);
  aggregate.revenue = revenue;
  aggregate.roas = aggregate.spend > 0 ? revenue / aggregate.spend : 0;

  return {
    aggregate,
    perpetuo: aggregateBucket(ads.filter((a) => a.campaign.bucket === "perpetuo"), "perpetuo"),
    lancamento: aggregateBucket(ads.filter((a) => a.campaign.bucket === "lancamento"), "lancamento"),
    outros: aggregateBucket(ads.filter((a) => a.campaign.bucket === "outros"), "outros"),
    fetchedAt,
    source: "meta",
    errors
  };
}

function mockTrafegoData(): Omit<TrafegoData, "fetchedAt" | "source" | "errors"> {
  const mockAds: AdMetrics[] = [
    parseAdInsight({
      ad_id: "mock_1",
      ad_name: "VSL Risotos | Exemplo",
      campaign_id: "c1",
      campaign: { id: "c1", name: "PERP Exemplo", objective: "OUTCOME_SALES" },
      creative: { thumbnail_url: "" },
      spend: "2341.50",
      impressions: "184230",
      clicks: "5712",
      cpc: "0.41",
      ctr: "3.10",
      cpm: "12.71",
      actions: [{ action_type: "purchase", value: "78" }],
      cost_per_action_type: [{ action_type: "purchase", value: "30.02" }],
      action_values: [{ action_type: "purchase", value: "11700.00" }],
      video_play_actions: [{ action_type: "video_view", value: "120000" }],
      video_3_sec_watched_actions: [{ action_type: "video_view", value: "77610" }],
      video_thruplay_watched_actions: [{ action_type: "video_view", value: "53093" }]
    }),
    parseAdInsight({
      ad_id: "mock_2",
      ad_name: "Lead Magnet PDF | Exemplo",
      campaign_id: "c2",
      campaign: { id: "c2", name: "LANC Exemplo", objective: "OUTCOME_LEADS" },
      creative: { image_url: "" },
      spend: "920.40",
      impressions: "67500",
      clicks: "2565",
      cpc: "0.36",
      ctr: "3.80",
      cpm: "13.64",
      actions: [{ action_type: "lead", value: "142" }],
      cost_per_action_type: [{ action_type: "lead", value: "6.48" }]
    })
  ];
  const aggregate = aggregateAccount(mockAds);
  aggregate.revenue = 11700;
  aggregate.roas = aggregate.spend > 0 ? 11700 / aggregate.spend : 0;
  return {
    aggregate,
    perpetuo: aggregateBucket(mockAds.filter((a) => a.campaign.bucket === "perpetuo"), "perpetuo"),
    lancamento: aggregateBucket(mockAds.filter((a) => a.campaign.bucket === "lancamento"), "lancamento"),
    outros: aggregateBucket([], "outros")
  };
}
```

- [ ] **Step 4: Remover funcao antiga `fetchMetaAdsMetrics` e `mockMetrics`**

Em `lib/integrations/meta-ads.ts`, deletar os blocos:
- `export async function fetchMetaAdsMetrics(...)` (era ~linhas 20-71 antes da reescrita)
- `function mockMetrics(): TrafficMetrics { ... }` (era ~linhas 73-82)
- `export type TrafficMetrics = {...}` (substituído por `AggregateMetrics`)

Manter apenas o que está nas tasks anteriores.

- [ ] **Step 5: Rodar testes**

Run: `npm test -- meta-ads.test.ts`
Expected: todos verdes.

- [ ] **Step 6: Verificar que /trafego ainda compila** (mockup vai quebrar por causa do remove — esperado, será corrigido na Task 10)

Run: `npx tsc --noEmit`
Expected: erros apenas em `app/(dashboard)/trafego/page.tsx` (mockup importa `fetchMetaAdsMetrics` removida) e possivelmente `app/(dashboard)/page.tsx`. Anotar quais.

- [ ] **Step 7: Commit**

```bash
git add lib/integrations/meta-ads.ts lib/integrations/meta-ads.test.ts
git commit -m "feat(meta-ads): fetchTrafegoData orchestrator with paging and DI"
```

---

## Task 7: Server action de refresh + RefreshButton real

**Files:**
- Create: `app/(dashboard)/trafego/actions.ts`
- Modify: `app/(dashboard)/trafego/_components/refresh-button.tsx`

- [ ] **Step 1: Criar server action**

Create `app/(dashboard)/trafego/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";

export async function refreshMetaAds() {
  revalidatePath("/trafego");
}
```

- [ ] **Step 2: Atualizar `RefreshButton` pra chamar a action**

Replace `app/(dashboard)/trafego/_components/refresh-button.tsx`:

```tsx
"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle2 } from "lucide-react";
import { refreshMetaAds } from "../actions";

export function RefreshButton() {
  const [isPending, startTransition] = useTransition();
  const [justDone, setJustDone] = useState(false);

  function refresh() {
    startTransition(async () => {
      await refreshMetaAds();
      setJustDone(true);
      setTimeout(() => setJustDone(false), 2000);
    });
  }

  if (justDone) {
    return (
      <Button variant="outline" disabled>
        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
        Atualizado
      </Button>
    );
  }

  return (
    <Button variant="outline" onClick={refresh} disabled={isPending}>
      <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
      {isPending ? "Atualizando..." : "Atualizar agora"}
    </Button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add app/\(dashboard\)/trafego/actions.ts app/\(dashboard\)/trafego/_components/refresh-button.tsx
git commit -m "feat(trafego): server action for manual refresh"
```

---

## Task 8: Refatorar AdCard pra aceitar dados reais

**Files:**
- Modify: `app/(dashboard)/trafego/_components/ad-card.tsx`

- [ ] **Step 1: Substituir o conteúdo**

Replace `app/(dashboard)/trafego/_components/ad-card.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";
import { Video, Image as ImageIcon, ExternalLink } from "lucide-react";
import type { AdMetrics } from "@/lib/integrations/meta-ads";

type Props = {
  ad: AdMetrics;
  rank: number;
  resultLabel: "Compras" | "Leads";
  resultCount: number;
  costPerResult: number | null;
  adsManagerUrl?: string;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function fallbackGradient(id: string) {
  const palette = [
    "linear-gradient(135deg, #2D3E24, #62644C)",
    "linear-gradient(135deg, #936221, #C8A14B)",
    "linear-gradient(135deg, #402D1D, #936221)",
    "linear-gradient(135deg, #4E5B3A, #A9B196)",
    "linear-gradient(135deg, #232011, #4E5B3A)"
  ];
  const seed = Array.from(id).reduce((s, c) => s + c.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

export function AdCard({
  ad,
  rank,
  resultLabel,
  resultCount,
  costPerResult,
  adsManagerUrl
}: Props) {
  const isVideo = ad.format === "video";
  const Icon = isVideo ? Video : ImageIcon;

  return (
    <div className="group rounded-xl border border-brand-800 bg-brand-900 overflow-hidden hover:border-accent-gold/40 hover:shadow-xl hover:shadow-black/40 transition-all flex flex-col">
      <div
        className="relative aspect-[16/10] flex items-center justify-center overflow-hidden"
        style={ad.thumbnailUrl ? undefined : { background: fallbackGradient(ad.id) }}
      >
        {ad.thumbnailUrl ? (
          <img
            src={ad.thumbnailUrl}
            alt={ad.name}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-3xl font-semibold text-white/40">{initials(ad.name)}</div>
        )}
        <div className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-bold text-accent-gold uppercase tracking-widest">
          #{rank}
        </div>
        <div className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white uppercase tracking-wider">
          <Icon className="h-3 w-3" />
          {isVideo ? "Vídeo" : "Estático"}
        </div>
        {adsManagerUrl && (
          <a
            href={adsManagerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-3 right-3 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ring-1 ring-white/20"
            aria-label="Abrir no gerenciador de anúncios"
          >
            <ExternalLink className="h-3.5 w-3.5 text-white" />
          </a>
        )}
      </div>

      <div className="p-4 flex flex-col gap-3 flex-1">
        <div>
          <h3 className="font-medium text-sm text-ink-50 leading-snug line-clamp-2">
            {ad.name}
          </h3>
          <p className="text-xs text-ink-300 mt-0.5 truncate">{ad.campaign.name}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 py-3 border-y border-brand-800">
          <Metric label="Investido" value={formatCurrency(ad.spend)} />
          <Metric label={resultLabel} value={resultCount.toLocaleString("pt-BR")} />
          <Metric
            label="Custo/result"
            value={costPerResult != null ? formatCurrency(costPerResult) : "—"}
            highlight
          />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <KpiInline
            label="Hook"
            value={ad.hookRate != null ? `${ad.hookRate.toFixed(1)}%` : "—"}
            tone={ad.hookRate != null ? quality(ad.hookRate, [25, 40]) : "muted"}
            title={isVideo ? "% de pessoas que assistiram ≥3s" : "Métrica de vídeo (n/a)"}
          />
          <KpiInline
            label="Hold"
            value={ad.holdRate != null ? `${ad.holdRate.toFixed(1)}%` : "—"}
            tone={ad.holdRate != null ? quality(ad.holdRate, [40, 60]) : "muted"}
            title={isVideo ? "% das pessoas com hook que chegaram ao thruplay" : "Métrica de vídeo (n/a)"}
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
  tone = "default",
  title
}: {
  label: string;
  value: string;
  tone?: "good" | "warn" | "bad" | "muted" | "default";
  title?: string;
}) {
  const valueColor = {
    good: "text-emerald-400",
    warn: "text-amber-400",
    bad: "text-red-400",
    muted: "text-ink-300",
    default: "text-ink-100"
  }[tone];

  return (
    <div
      title={title}
      className="flex items-center justify-between rounded-md bg-brand-950/50 ring-1 ring-brand-800 px-2 py-1.5"
    >
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
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/trafego/_components/ad-card.tsx
git commit -m "refactor(ad-card): accept AdMetrics with thumbnail fallback"
```

---

## Task 9: Atualizar BucketSection pro tipo real

**Files:**
- Modify: `app/(dashboard)/trafego/_components/bucket-section.tsx`

- [ ] **Step 1: Substituir o conteúdo**

Replace `app/(dashboard)/trafego/_components/bucket-section.tsx`:

```tsx
import { formatCurrency } from "@/lib/utils";
import { AdCard } from "./ad-card";
import { TrendingUp, Target, Layers } from "lucide-react";
import type { BucketSummary } from "@/lib/integrations/meta-ads";

const meta = {
  perpetuo: {
    label: "Perpétuo (vendas)",
    sub: "Campanhas otimizadas para compras",
    icon: TrendingUp,
    accent: "text-emerald-400",
    resultLabel: "Compras" as const
  },
  lancamento: {
    label: "Lançamento (leads)",
    sub: "Campanhas otimizadas para captação",
    icon: Target,
    accent: "text-accent-gold",
    resultLabel: "Leads" as const
  },
  outros: {
    label: "Outros",
    sub: "Campanhas de tráfego, alcance ou engajamento",
    icon: Layers,
    accent: "text-ink-300",
    resultLabel: "Cliques" as const
  }
};

export function BucketSection({
  summary,
  accountId
}: {
  summary: BucketSummary;
  accountId?: string;
}) {
  const m = meta[summary.bucket];
  const Icon = m.icon;
  const hasAds = summary.ads.length > 0;

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-brand-900 ring-1 ring-brand-800">
            <Icon className={`h-5 w-5 ${m.accent}`} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-ink-50">{m.label}</h2>
            <p className="text-xs text-ink-300">{m.sub}</p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-xs">
          <Summary label="Investido" value={formatCurrency(summary.totalSpend)} />
          <Summary
            label={m.resultLabel}
            value={summary.totalResults.toLocaleString("pt-BR")}
          />
          <Summary
            label="Custo médio"
            value={
              summary.avgCostPerResult > 0
                ? formatCurrency(summary.avgCostPerResult)
                : "—"
            }
            highlight
          />
        </div>
      </div>

      {hasAds ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summary.ads.map((ad, i) => {
            const resultCount =
              summary.bucket === "perpetuo" ? ad.purchases : ad.leads;
            const costPerResult =
              summary.bucket === "perpetuo" ? ad.costPerPurchase : ad.costPerLead;
            const adsManagerUrl = accountId
              ? `https://business.facebook.com/adsmanager/manage/ads?act=${accountId}&selected_ad_ids=${ad.id}`
              : undefined;
            return (
              <AdCard
                key={ad.id}
                ad={ad}
                rank={i + 1}
                resultLabel={m.resultLabel === "Compras" ? "Compras" : "Leads"}
                resultCount={resultCount}
                costPerResult={costPerResult}
                adsManagerUrl={adsManagerUrl}
              />
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-brand-800 bg-brand-900/30 p-8 text-center">
          <p className="text-sm text-ink-300">
            Nenhum anúncio neste período
          </p>
        </div>
      )}
    </section>
  );
}

function Summary({
  label,
  value,
  highlight
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-0.5">
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
```

- [ ] **Step 2: Commit**

```bash
git add app/\(dashboard\)/trafego/_components/bucket-section.tsx
git commit -m "refactor(bucket-section): use BucketSummary type from data layer"
```

---

## Task 10: Conectar `/trafego/page.tsx` aos dados reais

**Files:**
- Modify: `app/(dashboard)/trafego/page.tsx`

- [ ] **Step 1: Substituir o conteúdo do mockup pelo fetch real**

Replace `app/(dashboard)/trafego/page.tsx`:

```tsx
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
```

- [ ] **Step 2: Verificar TypeScript**

Run: `npx tsc --noEmit`
Expected: zero erros em `/trafego` (anteriores resolvidos). Pode ainda ter erro em `app/(dashboard)/page.tsx` (home importa `fetchMetaAdsMetrics`).

- [ ] **Step 3: Atualizar `app/(dashboard)/page.tsx` pra usar `fetchTrafegoData`**

Em `app/(dashboard)/page.tsx`, substituir:

```ts
import { fetchMetaAdsMetrics } from "@/lib/integrations/meta-ads";
```

por:

```ts
import { fetchTrafegoData } from "@/lib/integrations/meta-ads";
```

E substituir a chamada:

```ts
fetchMetaAdsMetrics(since, until),
```

por:

```ts
fetchTrafegoData({ since, until, token: process.env.META_ACCESS_TOKEN, accountId: process.env.META_AD_ACCOUNT_ID }),
```

Substituir o uso de `metrics.revenue`, `metrics.spend`, `metrics.impressions`, etc. por `metrics.aggregate.revenue`, `metrics.aggregate.spend`, etc.

- [ ] **Step 4: Rodar typecheck e dev server**

Run: `npx tsc --noEmit`
Expected: zero erros.

Run no terminal separado: `npm run dev`. Abrir `http://localhost:3001/trafego`.
Expected: página renderiza com banner amarelo "Dados de exemplo" + dados mock. PeriodSelector e RefreshButton aparecem e respondem.

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/trafego/page.tsx app/\(dashboard\)/page.tsx
git commit -m "feat(trafego): wire page to fetchTrafegoData with period and refresh"
```

---

## Task 11: Documentação de setup

**Files:**
- Create: `docs/META_SETUP.md`

- [ ] **Step 1: Criar arquivo**

Create `docs/META_SETUP.md`:

````markdown
# Setup Meta Ads — Painel Tráfego

Passo a passo pra ligar o painel `/trafego` com a conta de anúncios da Meta.

## 1. Criar System User no Business Manager

1. Entre em [business.facebook.com](https://business.facebook.com) → **Configurações da empresa**
2. **Usuários** → **Usuários do sistema** → **Adicionar**
3. Nome: `Painel Dani Rosa` — Função: **Funcionário**
4. Após criar, clique em **Atribuir ativos** → escolha sua conta de anúncios → permissão **Gerenciar campanhas** (essa permissão já inclui `ads_read`)

## 2. Gerar token

1. No mesmo System User → **Gerar novo token**
2. Selecione o App da Meta (ou crie um App em [developers.facebook.com](https://developers.facebook.com))
3. Marque as permissões: `ads_read` e `business_management`
4. **Token nunca expira** — guarde em lugar seguro, ele só aparece uma vez

## 3. Identificar o Ad Account ID

1. No menu de Conta de Anúncios, copie o ID (formato `act_739218456` ou `739218456`)
2. Use **apenas o número**, sem o prefixo `act_`

## 4. Configurar variáveis de ambiente

No servidor onde o painel roda, edite `.env.local` (ou `.env.production`):

```
META_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
META_AD_ACCOUNT_ID=739218456
META_AD_ACCOUNT_CURRENCY=BRL
```

Reinicie o serviço:

```bash
pm2 restart dani-rosa-dashboard
```

## 5. Verificar

- Abra `/trafego` no painel
- Banner amarelo "Dados de exemplo" deve sumir
- KPIs no topo refletem dados reais da Meta
- Os buckets Perpétuo / Lançamento devem aparecer com seus top 3 anúncios

## Resolver problemas

| Sintoma | Causa provável | Correção |
|---|---|---|
| Banner vermelho "Token expirado (190)" | Token revogado ou trocado | Gere novo token no Business Manager e atualize `.env` |
| Banner amarelo persiste | Variáveis não foram carregadas | `pm2 restart` e confira `.env` |
| Bucket "Outros" lotado | Campanhas com objetivos como TRAFFIC/REACH | Esperado; só campanhas de SALES e LEADS entram em Perpétuo/Lançamento |
| Hook/hold mostrando `—` em vídeos | Vídeo muito curto ou Meta ainda não populou | Aguardar 24h após o anúncio começar a rodar |
| Erro 17 (Rate limit) | Muitos refreshes em pouco tempo | Aguardar 5 min; o cache de 1h evita o problema |
````

- [ ] **Step 2: Commit**

```bash
git add docs/META_SETUP.md
git commit -m "docs: setup guide for Meta Ads integration"
```

---

## Task 12: Smoke test manual + critérios de aceitação

**Files:** (nenhum modificado — checklist manual)

- [ ] **Step 1: Sem token (modo mock)**

Garantir que `.env.local` **não** tem `META_ACCESS_TOKEN` (ou está vazio). `npm run dev`.

Abrir `http://localhost:3001/trafego`. Verificar:
- Banner amarelo "Dados de exemplo" visível
- KPIs no topo aparecem com valores mock (Investido > 0)
- Seções Perpétuo e Lançamento renderizam com top 3 cards cada
- AdCards de vídeo mostram Hook/Hold (com cor verde/âmbar/vermelho); estáticos mostram `—`
- Botão "Atualizar agora" abre spinner por ~1s e mostra "Atualizado" ao fim
- PeriodSelector troca período e a URL recebe `?period=7d` etc.

- [ ] **Step 2: Com token válido (teste real, opcional se Dani já configurou)**

Configurar `.env.local` com token real. Reiniciar dev. Validar:
- Banner amarelo some
- Header mostra `act_XXX · última atualização ha N min`
- KPIs batem com o que a Meta mostra no gerenciador (±1%)
- Anúncios de campanhas de PURCHASE aparecem em Perpétuo
- Anúncios de campanhas de LEAD aparecem em Lançamento
- Botão "Atualizar agora" força refetch (verificar Network do DevTools — chamada pra `graph.facebook.com` aparece novamente)
- Click no botão de link externo do AdCard abre `business.facebook.com/adsmanager/...` em nova aba

- [ ] **Step 3: Token inválido**

No `.env.local` colocar `META_ACCESS_TOKEN=invalido`. Reiniciar dev. Verificar:
- Banner amarelo aparece com mensagem do erro Meta (código 190 ou similar)
- KPIs mostram dados mock
- Página não quebra

- [ ] **Step 4: Build de produção**

Run: `npm run build`
Expected: build passa sem erro. Verifica que todas as type checks de produção batem.

- [ ] **Step 5: Commit (opcional, sem mudanças de arquivo)**

Se algum ajuste fino apareceu durante o smoke test, commitar. Caso contrário, pular.

---

## Self-Review da implementação

Antes de declarar pronto, confirmar:

1. **Spec coverage:**
   - Arquitetura A (fetch direto + cache 1h) → Task 6, 10 ✓
   - Bucketing por objective → Task 2, 3 ✓
   - Ranking top 3 com mínimos → Task 4 ✓
   - Hook/hold formulas → Task 3 ✓
   - PeriodSelector reaproveitado → Task 10 ✓
   - Botão refresh → Task 7 ✓
   - Estados de erro/sem token → Task 6, 10 ✓
   - Setup docs → Task 11 ✓
   - Testes em `lib/integrations/meta-ads.test.ts` → Tasks 2-6 ✓

2. **Pendências fora do escopo (próximas fases conforme spec):**
   - Snapshot diário em Supabase
   - Drawer de detalhe por anúncio
   - Comparativo entre períodos
   - Webhook Hotmart pra cruzar revenue

3. **Migração necessária ao mover pra outra VPS:**
   - Copiar `.env.production` (com `META_*` configurado)
   - `npm ci` + `npm run build` + `pm2 start ecosystem.config.js`
   - Sem mudança de DB nem de bucket de storage

---

Plan complete and saved to `docs/superpowers/plans/2026-05-28-trafego-meta-ads.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch fresh subagent per task, review between tasks, fast iteration.

**2. Inline Execution** — execute tasks in this session with checkpoints for review.

Which approach?

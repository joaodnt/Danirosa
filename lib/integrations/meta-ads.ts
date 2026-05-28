/**
 * Meta Ads (Facebook/Instagram) integration
 * Docs: https://developers.facebook.com/docs/marketing-apis/
 *
 * Para conectar de verdade:
 * 1. Criar App em developers.facebook.com
 * 2. Gerar System User Access Token com permissão ads_read
 * 3. Preencher META_ACCESS_TOKEN e META_AD_ACCOUNT_ID no .env
 */

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

// ---------------------------------------------------------------------------
// parseAdInsight
// ---------------------------------------------------------------------------

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

function actionsSum(
  actions: RawAction[] | undefined,
  types: Set<string> | string
): number {
  if (!actions) return 0;
  const match =
    typeof types === "string"
      ? (t: string) => t === types
      : (t: string) => types.has(t);
  return actions
    .filter((a) => match(a.action_type))
    .reduce((s, a) => s + num(a.value), 0);
}

function actionValue(
  actions: RawAction[] | undefined,
  type: string
): number | null {
  if (!actions) return null;
  const found = actions.find((a) => a.action_type === type);
  return found ? num(found.value) : null;
}

function inferFormat(raw: RawInsight): AdFormat {
  if (raw.creative?.video_id || raw.video_play_actions?.length) return "video";
  if (raw.creative?.image_url || raw.creative?.thumbnail_url) return "image";
  return "unknown";
}

function resolveThumbnailUrl(raw: RawInsight): string | null {
  return raw.creative?.thumbnail_url ?? raw.creative?.image_url ?? null;
}

// ---------------------------------------------------------------------------
// rankAdsInBucket
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// aggregateBucket + aggregateAccount
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// parseAdInsight
// ---------------------------------------------------------------------------

export function parseAdInsight(raw: RawInsight): AdMetrics {
  const spend = num(raw.spend);
  const impressions = num(raw.impressions);
  const format = inferFormat(raw);

  const purchases = actionsSum(raw.actions, "purchase");
  const leads = actionsSum(raw.actions, LEAD_ACTION_TYPES);

  // Custo por purchase: usar cost_per_action_type se a Meta retornou,
  // caso contrario derivar spend/purchases.
  const costPerPurchaseMeta = actionValue(raw.cost_per_action_type, "purchase");
  const costPerPurchase =
    costPerPurchaseMeta ?? (purchases > 0 ? spend / purchases : null);

  // Custo por lead: como pode somar varios action_types, derivamos sempre de spend/leads
  // para garantir consistencia com o que a UI vai mostrar.
  const costPerLead = leads > 0 ? spend / leads : null;

  const v3s =
    actionValue(raw.video_3_sec_watched_actions, "video_view") ?? 0;
  const vThru =
    actionValue(raw.video_thruplay_watched_actions, "video_view") ?? 0;
  const hookRate =
    format === "video" && impressions > 0
      ? (v3s / impressions) * 100
      : null;
  const holdRate =
    format === "video" && v3s > 0 ? (vThru / v3s) * 100 : null;

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
    thumbnailUrl: resolveThumbnailUrl(raw)
  };
}

// ---------------------------------------------------------------------------
// fetchTrafegoData orchestrator
// ---------------------------------------------------------------------------

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
      res = await fetchImpl(nextUrl, { next: { revalidate: 3600 } } as RequestInit);
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

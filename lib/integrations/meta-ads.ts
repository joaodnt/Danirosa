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

export type TrafficMetrics = {
  spend: number;
  revenue: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
};

export async function fetchMetaAdsMetrics(
  since: string,
  until: string
): Promise<TrafficMetrics> {
  const token = process.env.META_ACCESS_TOKEN;
  const accountId = process.env.META_AD_ACCOUNT_ID;

  if (!token || !accountId) {
    return mockMetrics();
  }

  const fields = [
    "spend",
    "impressions",
    "clicks",
    "actions",
    "action_values"
  ].join(",");

  const url =
    `https://graph.facebook.com/v21.0/act_${accountId}/insights` +
    `?fields=${fields}` +
    `&time_range={"since":"${since}","until":"${until}"}` +
    `&access_token=${token}`;

  const res = await fetch(url, { next: { revalidate: 3600 } });
  if (!res.ok) {
    console.error("Meta Ads API error", await res.text());
    return mockMetrics();
  }

  const json = await res.json();
  const row = json.data?.[0] ?? {};
  const spend = Number(row.spend ?? 0);
  const revenue = Number(
    row.action_values?.find((a: { action_type: string }) => a.action_type === "purchase")
      ?.value ?? 0
  );
  const conversions = Number(
    row.actions?.find((a: { action_type: string }) => a.action_type === "purchase")
      ?.value ?? 0
  );

  return {
    spend,
    revenue,
    impressions: Number(row.impressions ?? 0),
    clicks: Number(row.clicks ?? 0),
    conversions,
    roas: spend > 0 ? revenue / spend : 0
  };
}

function mockMetrics(): TrafficMetrics {
  return {
    spend: 4820.5,
    revenue: 18450.0,
    impressions: 245000,
    clicks: 3820,
    conversions: 47,
    roas: 18450 / 4820.5
  };
}

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

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

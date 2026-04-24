/**
 * Meta Ads (Facebook/Instagram) integration
 * Docs: https://developers.facebook.com/docs/marketing-apis/
 *
 * Para conectar de verdade:
 * 1. Criar App em developers.facebook.com
 * 2. Gerar System User Access Token com permissão ads_read
 * 3. Preencher META_ACCESS_TOKEN e META_AD_ACCOUNT_ID no .env
 */

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

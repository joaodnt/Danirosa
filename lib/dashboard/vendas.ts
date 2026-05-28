import { createClient } from "@/lib/supabase/server";
import { fetchTrafegoData } from "@/lib/integrations/meta-ads";
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
    fetchTrafegoData({
      since: period.from,
      until: period.until,
      token: process.env.META_ACCESS_TOKEN,
      accountId: process.env.META_AD_ACCOUNT_ID
    }),
    supabase
      .from("manual_costs")
      .select("amount")
      .gte("occurred_at", period.from)
      .lte("occurred_at", period.until)
  ]);

  if (ordersResult.error) console.error("getVendasMetrics: orders query error", ordersResult.error);
  if (costsResult.error) console.error("getVendasMetrics: manual_costs query error", costsResult.error);

  const ordersRows = ordersResult.data ?? [];
  const costsRows = costsResult.data ?? [];

  const resultado = ordersRows.reduce((s, r) => s + Number(r.amount), 0);
  const ordersCount = ordersRows.length;

  const impostoPct = Number(process.env.DASHBOARD_IMPOSTO_PCT ?? 6);
  const platPct = Number(process.env.DASHBOARD_PLATAFORMA_PCT ?? 9.9);

  const imposto = resultado * (impostoPct / 100);
  const plataforma = resultado * (platPct / 100);
  const custosManuais = costsRows.reduce((s, r) => s + Number(r.amount), 0);

  const investimento = ads.aggregate.spend;
  const cpm = ads.aggregate.impressions > 0 ? (ads.aggregate.spend / ads.aggregate.impressions) * 1000 : 0;
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

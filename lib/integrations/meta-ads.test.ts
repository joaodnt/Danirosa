import { describe, it, expect } from "vitest";
import { assignBucket, parseAdInsight, rankAdsInBucket, aggregateBucket, aggregateAccount } from "./meta-ads";
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
import {
  VIDEO_AD_INSIGHT,
  STATIC_AD_INSIGHT,
  LEAD_AD_INSIGHT
} from "./meta-ads-fixtures";

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

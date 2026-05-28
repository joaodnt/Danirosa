import { describe, it, expect } from "vitest";
import { assignBucket, parseAdInsight } from "./meta-ads";
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

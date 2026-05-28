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

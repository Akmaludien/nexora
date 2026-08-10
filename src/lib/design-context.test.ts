import { describe, expect, it } from "vitest";
import { buildDesignContextMarkdown, parseDesignContextInput } from "./design-context";

describe("parseDesignContextInput", () => {
  it("accepts the canonical nexora.design-context shape", () => {
    const payload = {
      schema: "nexora.design-context",
      version: 1,
      generatedBy: "vinyasa 0.3.0",
      sourceUrl: "https://design.example/",
      sourceTitle: "Design Fixture",
      generatedAt: "2026-08-10T00:00:00.000Z",
      designSystem: { colors: [{ name: "brand", hex: "#2563eb", usage: 60 }], neutralColors: [], fontFamilies: ["Inter"], fontSizes: [{ value: "16px", px: 16 }], spacing: [], radius: [] },
      health: { overall: 87 },
      accessibility: { critical: 0, warning: 1, pass: 5 },
      components: { total: 3 },
    };
    const { ctx, isValid } = parseDesignContextInput(payload);
    expect(isValid).toBe(true);
    expect(ctx.health.overall).toBe(87);
    expect(ctx.designSystem.colors[0].hex).toBe("#2563eb");
  });

  it("bounds a Vinyasa DesignModel export into the canonical shape", () => {
    const vinyasaModel = {
      schemaVersion: "1.0.0",
      metadata: { tool: "vinyasa", version: "0.3.0" },
      source: { url: "https://shop.example/", title: "Shop" },
      tokens: {
        colors: { primary: [{ name: "blue", hex: "#2563eb", usage: 55 }], neutral: [{ name: "ink", hex: "#111827", usage: 40 }] },
        typography: { families: [{ raw: '"Inter", sans-serif' }], sizes: [{ raw: "14px", px: 14 }, { raw: "16px", px: 16 }] },
        spacing: [{ raw: "8px", px: 8 }],
        radius: [{ raw: "8px", px: 8 }],
      },
      health: { overall: 91 },
      accessibility: { wcagAA: { critical: 0, warning: 2, pass: 8 } },
      components: [{ id: "button" }],
    };
    const { ctx, isValid } = parseDesignContextInput(vinyasaModel);
    expect(isValid).toBe(true);
    expect(ctx.generatedBy).toBe("vinyasa 0.3.0");
    expect(ctx.sourceUrl).toBe("https://shop.example/");
    expect(ctx.designSystem.colors.length).toBe(1);
    expect(ctx.designSystem.neutralColors.length).toBe(1);
    expect(ctx.components.total).toBe(1);
    expect(ctx.accessibility.critical).toBe(0);
  });

  it("rejects payloads without recognizable tokens", () => {
    const { isValid } = parseDesignContextInput({ hello: "world" });
    expect(isValid).toBe(false);
  });
});

describe("buildDesignContextMarkdown", () => {
  it("renders tokens, health, and accessibility into markdown", () => {
    const { ctx } = parseDesignContextInput({
      schema: "nexora.design-context",
      version: 1,
      generatedBy: "vinyasa 0.3.0",
      sourceUrl: "https://design.example/",
      sourceTitle: "Design Fixture",
      generatedAt: "2026-08-10T00:00:00.000Z",
      designSystem: { colors: [{ name: "brand", hex: "#2563eb", usage: 60 }], neutralColors: [], fontFamilies: ["Inter"], fontSizes: [{ value: "16px", px: 16 }], spacing: [{ value: "8px", px: 8 }], radius: [{ value: "8px", px: 8 }] },
      health: { overall: 87 },
      accessibility: { critical: 0, warning: 1, pass: 5 },
      components: { total: 3 },
    });
    const markdown = buildDesignContextMarkdown(ctx);
    expect(markdown).toContain("#2563eb");
    expect(markdown).toContain("87/100");
    expect(markdown).toContain("Inter");
  });
});
import {
  SOURCES_TEMPLATE,
  APP_SUMMARY_TEMPLATE,
  REDUCE_INSIGHTS_TEMPLATE,
} from "../../src/prompts/templates";

describe("prompts/templates", () => {
  describe("SOURCES_TEMPLATE", () => {
    it("should be defined", () => {
      expect(SOURCES_TEMPLATE).toBeDefined();
      expect(typeof SOURCES_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(SOURCES_TEMPLATE).toContain("{{contentDesc}}");
      expect(SOURCES_TEMPLATE).toContain("{{instructions}}");
      expect(SOURCES_TEMPLATE).toContain("{{jsonSchema}}");
      expect(SOURCES_TEMPLATE).toContain("{{forceJSON}}");
      expect(SOURCES_TEMPLATE).toContain("{{content}}");
    });

    it("should contain CODE section marker", () => {
      expect(SOURCES_TEMPLATE).toContain("CODE:");
    });
  });

  describe("APP_SUMMARY_TEMPLATE", () => {
    it("should be defined", () => {
      expect(APP_SUMMARY_TEMPLATE).toBeDefined();
      expect(typeof APP_SUMMARY_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(APP_SUMMARY_TEMPLATE).toContain("{{contentDesc}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{instructions}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{jsonSchema}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{forceJSON}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{content}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should contain FILE_SUMMARIES section marker", () => {
      expect(APP_SUMMARY_TEMPLATE).toContain("FILE_SUMMARIES:");
    });
  });

  describe("REDUCE_INSIGHTS_TEMPLATE", () => {
    it("should be defined", () => {
      expect(REDUCE_INSIGHTS_TEMPLATE).toBeDefined();
      expect(typeof REDUCE_INSIGHTS_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{contentDesc}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{categoryKey}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{jsonSchema}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{forceJSON}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{content}}");
    });

    it("should contain FRAGMENTED_DATA section marker", () => {
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("FRAGMENTED_DATA:");
    });
  });
});

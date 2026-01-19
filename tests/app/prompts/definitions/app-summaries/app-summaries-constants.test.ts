/**
 * Tests for app summary constants and utility functions.
 *
 * These tests verify that the constants and helper functions exported from
 * app-summaries.constants.ts work correctly.
 */
import {
  APP_SUMMARY_CONTENT_DESC,
  APP_SUMMARY_PROMPT_FRAGMENTS,
  buildReduceInsightsContentDesc,
} from "../../../../../src/app/prompts/app-summaries/app-summaries.constants";

describe("app-summaries.constants", () => {
  describe("APP_SUMMARY_CONTENT_DESC", () => {
    it("should export the content description constant", () => {
      expect(APP_SUMMARY_CONTENT_DESC).toBeDefined();
      expect(typeof APP_SUMMARY_CONTENT_DESC).toBe("string");
    });

    it("should have the expected value", () => {
      expect(APP_SUMMARY_CONTENT_DESC).toBe("a set of source file summaries");
    });
  });

  describe("APP_SUMMARY_PROMPT_FRAGMENTS", () => {
    it("should export the prompt fragments object", () => {
      expect(APP_SUMMARY_PROMPT_FRAGMENTS).toBeDefined();
      expect(typeof APP_SUMMARY_PROMPT_FRAGMENTS).toBe("object");
    });

    it("should have DETAILED_DESC fragment", () => {
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.DETAILED_DESC).toBeDefined();
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.DETAILED_DESC).toBe("* A detailed description");
    });

    it("should have CONCISE_LIST fragment", () => {
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST).toBeDefined();
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST).toBe("* A concise list");
    });

    it("should have COMPREHENSIVE_LIST fragment", () => {
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.COMPREHENSIVE_LIST).toBeDefined();
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.COMPREHENSIVE_LIST).toBe("* A comprehensive list");
    });

    it("should be immutable (as const)", () => {
      // TypeScript will enforce this at compile time
      // This test verifies the object structure is as expected
      const keys = Object.keys(APP_SUMMARY_PROMPT_FRAGMENTS);
      expect(keys).toEqual(["DETAILED_DESC", "CONCISE_LIST", "COMPREHENSIVE_LIST"]);
    });
  });

  describe("buildReduceInsightsContentDesc", () => {
    it("should export the function", () => {
      expect(buildReduceInsightsContentDesc).toBeDefined();
      expect(typeof buildReduceInsightsContentDesc).toBe("function");
    });

    it("should generate content description with the provided category key", () => {
      const result = buildReduceInsightsContentDesc("technologies");
      expect(result).toContain("technologies");
    });

    it("should include consolidation instructions", () => {
      const result = buildReduceInsightsContentDesc("boundedContexts");
      expect(result).toContain("consolidate");
      expect(result).toContain("de-duplicated");
      expect(result).toContain("merge");
    });

    it("should include the category key in quotes", () => {
      const result = buildReduceInsightsContentDesc("potentialMicroservices");
      expect(result).toContain("'potentialMicroservices'");
    });

    it("should produce different output for different categories", () => {
      const result1 = buildReduceInsightsContentDesc("technologies");
      const result2 = buildReduceInsightsContentDesc("businessProcesses");
      expect(result1).not.toBe(result2);
      expect(result1).toContain("technologies");
      expect(result2).toContain("businessProcesses");
    });
  });
});

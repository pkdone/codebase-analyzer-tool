/**
 * Tests for prompts module barrel exports.
 * Validates that the index.ts exports are working correctly.
 */
import * as PromptsModule from "../../../src/app/prompts";

describe("prompts module barrel exports", () => {
  describe("registry exports", () => {
    it("should export promptManager", () => {
      expect(PromptsModule.promptManager).toBeDefined();
      expect(typeof PromptsModule.promptManager).toBe("object");
    });

    it("should export createReduceInsightsPrompt", () => {
      expect(PromptsModule.createReduceInsightsPrompt).toBeDefined();
      expect(typeof PromptsModule.createReduceInsightsPrompt).toBe("function");
    });
  });

  describe("renderer exports", () => {
    it("should export renderPrompt", () => {
      expect(PromptsModule.renderPrompt).toBeDefined();
      expect(typeof PromptsModule.renderPrompt).toBe("function");
    });

    it("should export buildSchemaSection", () => {
      expect(PromptsModule.buildSchemaSection).toBeDefined();
      expect(typeof PromptsModule.buildSchemaSection).toBe("function");
    });
  });

  describe("template exports", () => {
    it("should export BASE_PROMPT_TEMPLATE", () => {
      expect(PromptsModule.BASE_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof PromptsModule.BASE_PROMPT_TEMPLATE).toBe("string");
    });

    it("should export CODEBASE_QUERY_TEMPLATE", () => {
      expect(PromptsModule.CODEBASE_QUERY_TEMPLATE).toBeDefined();
      expect(typeof PromptsModule.CODEBASE_QUERY_TEMPLATE).toBe("string");
    });

    it("should export FORCE_JSON_FORMAT", () => {
      expect(PromptsModule.FORCE_JSON_FORMAT).toBeDefined();
      expect(typeof PromptsModule.FORCE_JSON_FORMAT).toBe("string");
    });

    it("should export DEFAULT_SYSTEM_ROLE", () => {
      expect(PromptsModule.DEFAULT_SYSTEM_ROLE).toBeDefined();
      expect(typeof PromptsModule.DEFAULT_SYSTEM_ROLE).toBe("string");
    });

    it("should export QUERY_SYSTEM_ROLE", () => {
      expect(PromptsModule.QUERY_SYSTEM_ROLE).toBeDefined();
      expect(typeof PromptsModule.QUERY_SYSTEM_ROLE).toBe("string");
    });
  });

  describe("definitions exports", () => {
    it("should export appSummaryConfigMap", () => {
      expect(PromptsModule.appSummaryConfigMap).toBeDefined();
      expect(typeof PromptsModule.appSummaryConfigMap).toBe("object");
    });

    it("should export sourceConfigMap", () => {
      expect(PromptsModule.sourceConfigMap).toBeDefined();
      expect(typeof PromptsModule.sourceConfigMap).toBe("object");
    });
  });

  describe("promptManager structure", () => {
    it("should have appSummaries property", () => {
      expect(PromptsModule.promptManager.appSummaries).toBeDefined();
    });

    it("should have sources property", () => {
      expect(PromptsModule.promptManager.sources).toBeDefined();
    });

    it("should have codebaseQuery property", () => {
      expect(PromptsModule.promptManager.codebaseQuery).toBeDefined();
    });
  });
});

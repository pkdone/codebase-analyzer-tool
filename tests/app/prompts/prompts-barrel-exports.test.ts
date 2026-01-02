/**
 * Tests for prompts module barrel exports.
 * Validates that the index.ts exports are working correctly.
 */
import * as PromptsModule from "../../../src/app/prompts";

describe("prompts module barrel exports", () => {
  describe("registry exports", () => {
    it("should export promptRegistry", () => {
      expect(PromptsModule.promptRegistry).toBeDefined();
      expect(typeof PromptsModule.promptRegistry).toBe("object");
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

  describe("promptRegistry structure", () => {
    it("should have appSummaries property", () => {
      expect(PromptsModule.promptRegistry.appSummaries).toBeDefined();
    });

    it("should have sources property", () => {
      expect(PromptsModule.promptRegistry.sources).toBeDefined();
    });

    it("should have codebaseQuery property", () => {
      expect(PromptsModule.promptRegistry.codebaseQuery).toBeDefined();
    });
  });
});


import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
  CODEBASE_QUERY_TEMPLATE,
} from "../../../src/app/prompts/app-templates";

const EXPECTED_SYSTEM_ROLE_PREFIX =
  "Act as a senior developer analyzing the code in an existing application.";

describe("prompts/templates", () => {
  describe("ANALYSIS_PROMPT_TEMPLATE", () => {
    it("should be defined", () => {
      expect(ANALYSIS_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof ANALYSIS_PROMPT_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      // jsonSchema and forceJSON are now consolidated into schemaSection
      // which is built by the renderer for JSON-mode prompts
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{contentWrapper}}");
      // Note: partialAnalysisNote is handled via PARTIAL_ANALYSIS_TEMPLATE, not as a placeholder
    });

    it("should start with the system role", () => {
      expect(ANALYSIS_PROMPT_TEMPLATE.startsWith(EXPECTED_SYSTEM_ROLE_PREFIX)).toBe(true);
    });

    it("should NOT contain partialAnalysisNote placeholder", () => {
      // Partial analysis is handled via a separate derived template
      expect(ANALYSIS_PROMPT_TEMPLATE).not.toContain("{{partialAnalysisNote}}");
    });
  });

  describe("PARTIAL_ANALYSIS_TEMPLATE", () => {
    it("should be defined and derived from ANALYSIS_PROMPT_TEMPLATE", () => {
      expect(PARTIAL_ANALYSIS_TEMPLATE).toBeDefined();
      expect(typeof PARTIAL_ANALYSIS_TEMPLATE).toBe("string");
    });

    it("should contain the partial analysis note", () => {
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("partial analysis");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("focus on extracting insights from this subset");
    });

    it("should contain all the same placeholders as ANALYSIS_PROMPT_TEMPLATE", () => {
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{contentDesc}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{instructionsText}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{schemaSection}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{content}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{contentWrapper}}");
    });

    it("should start with the system role", () => {
      expect(PARTIAL_ANALYSIS_TEMPLATE.startsWith(EXPECTED_SYSTEM_ROLE_PREFIX)).toBe(true);
    });
  });

  describe("CODEBASE_QUERY_TEMPLATE", () => {
    it("should be defined", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toBeDefined();
      expect(typeof CODEBASE_QUERY_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{question}}");
      expect(CODEBASE_QUERY_TEMPLATE).toContain("{{content}}");
    });

    it("should start with the default system role", () => {
      expect(CODEBASE_QUERY_TEMPLATE.startsWith(EXPECTED_SYSTEM_ROLE_PREFIX)).toBe(true);
    });

    it("should reference CODE and QUESTION sections", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("QUESTION:");
      expect(CODEBASE_QUERY_TEMPLATE).toContain("CODE:");
    });
  });
});

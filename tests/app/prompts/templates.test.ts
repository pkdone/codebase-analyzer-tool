import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";

describe("prompts/templates", () => {
  describe("BASE_PROMPT_TEMPLATE", () => {
    it("should be defined", () => {
      expect(BASE_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof BASE_PROMPT_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      // jsonSchema and forceJSON are now consolidated into schemaSection
      // which is built by the renderer for JSON-mode prompts
      expect(BASE_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{contentWrapper}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });
  });
});

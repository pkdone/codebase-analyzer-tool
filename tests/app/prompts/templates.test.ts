import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";

describe("prompts/templates", () => {
  describe("BASE_PROMPT_TEMPLATE", () => {
    it("should be defined", () => {
      expect(BASE_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof BASE_PROMPT_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain("{{introText}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{jsonSchema}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{forceJSON}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{contentWrapper}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });
  });
});

import {
  BASE_PROMPT_TEMPLATE,
  CODEBASE_QUERY_TEMPLATE,
  DEFAULT_SYSTEM_ROLE,
  FORCE_JSON_FORMAT,
} from "../../../src/app/prompts/templates";

describe("prompts/templates", () => {
  describe("System Role Constants", () => {
    it("should define DEFAULT_SYSTEM_ROLE for code analysis", () => {
      expect(DEFAULT_SYSTEM_ROLE).toBe(
        "Act as a senior developer analyzing the code in an existing application.",
      );
    });

    it("should use DEFAULT_SYSTEM_ROLE in BASE_PROMPT_TEMPLATE", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain(DEFAULT_SYSTEM_ROLE);
    });

    it("should use DEFAULT_SYSTEM_ROLE in CODEBASE_QUERY_TEMPLATE", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain(DEFAULT_SYSTEM_ROLE);
    });
  });

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

    it("should start with the system role", () => {
      expect(BASE_PROMPT_TEMPLATE.startsWith(DEFAULT_SYSTEM_ROLE)).toBe(true);
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
      expect(CODEBASE_QUERY_TEMPLATE.startsWith(DEFAULT_SYSTEM_ROLE)).toBe(true);
    });

    it("should reference CODE and QUESTION sections", () => {
      expect(CODEBASE_QUERY_TEMPLATE).toContain("QUESTION:");
      expect(CODEBASE_QUERY_TEMPLATE).toContain("CODE:");
    });
  });

  describe("FORCE_JSON_FORMAT", () => {
    it("should be defined", () => {
      expect(FORCE_JSON_FORMAT).toBeDefined();
      expect(typeof FORCE_JSON_FORMAT).toBe("string");
    });

    it("should contain JSON format requirements", () => {
      expect(FORCE_JSON_FORMAT).toContain("The response MUST be valid JSON");
      expect(FORCE_JSON_FORMAT).toContain("property names must be quoted");
    });
  });
});

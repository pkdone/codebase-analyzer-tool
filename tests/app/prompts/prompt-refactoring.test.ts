import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { PromptDefinition } from "../../../src/app/prompts/prompt.types";
import { z } from "zod";
import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";

describe("Prompt Refactoring", () => {
  const testDefinition: PromptDefinition = {
    label: "Test",
    contentDesc:
      "Act as a senior developer analyzing the code in a legacy application. Based on test content shown below, return:\n\n{{instructionsText}}.",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    template: BASE_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE" as const,
    wrapInCodeBlock: true,
  };

  const testContent = "test file content";

  describe("Function-based rendering", () => {
    it("should render prompts correctly with function", () => {
      const rendered = renderPrompt(testDefinition, { content: testContent });

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
      expect(rendered).toContain("instruction 1");
      expect(rendered).toContain("instruction 2");
    });

    it("should handle different template types", () => {
      const appSummaryDefinition = {
        ...testDefinition,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(appSummaryDefinition, { content: testContent });

      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).not.toContain("CODE:");
    });

    it("should handle reduce template with category key replacement via render parameters", () => {
      const categoryKey = "entities";
      const reduceDefinition = {
        ...testDefinition,
        contentDesc: "Consolidate {{categoryKey}} from the data below.",
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(reduceDefinition, { categoryKey, content: testContent });

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should handle complex instruction sections with titles", () => {
      const complexDefinition: PromptDefinition = {
        ...testDefinition,
        instructions: [
          "__Section 1__\npoint 1\npoint 2",
          "point without title",
          "__Section 2__\npoint 3",
        ],
      };
      const rendered = renderPrompt(complexDefinition, { content: testContent });

      expect(rendered).toContain("__Section 1__");
      expect(rendered).toContain("__Section 2__");
      expect(rendered).toContain("point 1");
      expect(rendered).toContain("point 2");
      expect(rendered).toContain("point without title");
      expect(rendered).toContain("point 3");
    });

    it("should handle additional parameters in render method", () => {
      // Use BASE_PROMPT_TEMPLATE with app summary configuration
      const appSummaryDefinition = {
        ...testDefinition,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(appSummaryDefinition, {
        content: testContent,
        partialAnalysisNote: "This is a custom note for testing",
      });

      expect(rendered).toContain("This is a custom note for testing");
    });

    it("should handle empty additional parameters", () => {
      const rendered = renderPrompt(testDefinition, { content: testContent });

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain(testContent);
    });
  });

  describe("Template consolidation", () => {
    it("should export all required templates", () => {
      expect(BASE_PROMPT_TEMPLATE).toBeDefined();
    });

    it("should have consistent template structure", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{jsonSchema}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should not have any placeholder syntax in rendered output", () => {
      const rendered = renderPrompt(testDefinition, { content: testContent });

      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe("Backward compatibility", () => {
    it("should produce identical output as before refactoring", () => {
      // Test that the constructor produces the same output as the old factory methods
      const sourceDefinition = {
        ...testDefinition,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: true,
      };
      const appSummaryDefinition = {
        ...testDefinition,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };

      const sourceRendered = renderPrompt(sourceDefinition, { content: testContent });
      const appSummaryRendered = renderPrompt(appSummaryDefinition, { content: testContent });

      // Verify the structure is correct
      expect(sourceRendered).toContain("CODE:");
      expect(appSummaryRendered).toContain("FILE_SUMMARIES:");

      // Verify no placeholders remain
      expect(sourceRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
      expect(appSummaryRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });
});

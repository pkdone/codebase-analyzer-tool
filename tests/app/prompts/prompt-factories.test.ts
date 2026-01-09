import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { PromptDefinition } from "../../../src/app/prompts/prompt.types";
import { z } from "zod";
import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";

describe("Prompt Constructor and Templates", () => {
  const sourceDefinition: PromptDefinition = {
    label: "Test",
    contentDesc:
      "Act as a senior developer analyzing the code in a legacy application. Based on test content shown below...",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    template: BASE_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE" as const,
    wrapInCodeBlock: true,
  };

  const appSummaryDefinition: PromptDefinition = {
    label: "Test",
    contentDesc:
      "Act as a senior developer analyzing the code in a legacy application. Based on test content shown below...",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    template: BASE_PROMPT_TEMPLATE,
    dataBlockHeader: "FILE_SUMMARIES" as const,
    wrapInCodeBlock: false,
  };

  const testContent = "test file content";

  describe("renderPrompt function", () => {
    it("should render a prompt with BASE_PROMPT_TEMPLATE for sources", () => {
      const rendered = renderPrompt(sourceDefinition, { content: testContent });

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
    });

    it("should render a prompt with BASE_PROMPT_TEMPLATE for app summaries", () => {
      const rendered = renderPrompt(appSummaryDefinition, { content: testContent });

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).toContain(testContent);
    });

    it("should handle partialAnalysisNote parameter", () => {
      const partialNote = "This is a partial analysis note";
      const rendered = renderPrompt(appSummaryDefinition, {
        content: testContent,
        partialAnalysisNote: partialNote,
      });

      expect(rendered).toContain(partialNote);
    });
  });

  describe("Template consolidation", () => {
    it("should export BASE_PROMPT_TEMPLATE", () => {
      expect(BASE_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof BASE_PROMPT_TEMPLATE).toBe("string");
    });

    it("should have consistent template structure", () => {
      // All prompts now use the unified BASE_PROMPT_TEMPLATE structure
      // jsonSchema and forceJSON are now consolidated into schemaSection
      expect(BASE_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should handle reduce template with category key via inline definition", () => {
      // categoryKey is directly embedded in contentDesc, rather than being a placeholder
      const categoryKey = "technologies";
      const reduceDefinition = {
        ...sourceDefinition,
        // Factory would pre-populate contentDesc with the category key
        contentDesc: `Act as a senior developer. You've been provided with data containing '${categoryKey}'...`,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(reduceDefinition, {
        content: testContent,
      });

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      // No placeholder should exist since factory embeds the value directly
      expect(rendered).not.toContain("{{categoryKey}}");
    });
  });
});

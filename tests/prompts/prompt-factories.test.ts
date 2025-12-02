import { renderPrompt } from "../../src/prompts/prompt-renderer";
import { PromptDefinition } from "../../src/prompts/prompt.types";
import { z } from "zod";
import { BASE_PROMPT_TEMPLATE } from "../../src/prompts/templates";

describe("Prompt Constructor and Templates", () => {
  const sourceDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    template: BASE_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE" as const,
    wrapInCodeBlock: true,
  };

  const appSummaryDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
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
      expect(BASE_PROMPT_TEMPLATE).toContain("{{introText}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{jsonSchema}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should handle reduce template with category key replacement", () => {
      const categoryKey = "entities";
      const reduceDefinition = {
        ...sourceDefinition,
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(reduceDefinition, {
        categoryKey,
        content: testContent,
      });

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(`'${categoryKey}'`);
      expect(rendered).not.toContain("{{categoryKey}}");
    });
  });
});

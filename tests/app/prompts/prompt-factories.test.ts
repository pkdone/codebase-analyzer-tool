import { renderPrompt } from "../../../src/common/prompts/prompt-renderer";
import type { RenderablePrompt } from "../../../src/common/prompts/prompt.types";
import { z } from "zod";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";

describe("Prompt Constructor and Templates", () => {
  const sourceDefinition: RenderablePrompt = {
    label: "Test",
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below...",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    template: ANALYSIS_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE" as const,
    wrapInCodeBlock: true,
  };

  const appSummaryDefinition: RenderablePrompt = {
    label: "Test",
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below...",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    template: ANALYSIS_PROMPT_TEMPLATE,
    dataBlockHeader: "FILE_SUMMARIES" as const,
    wrapInCodeBlock: false,
  };

  const testContent = "test file content";

  describe("renderPrompt function", () => {
    it("should render a prompt with ANALYSIS_PROMPT_TEMPLATE for sources", () => {
      const rendered = renderPrompt(sourceDefinition, testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
    });

    it("should render a prompt with ANALYSIS_PROMPT_TEMPLATE for app summaries", () => {
      const rendered = renderPrompt(appSummaryDefinition, testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).toContain(testContent);
    });

    it("should use PARTIAL_ANALYSIS_TEMPLATE for partial analysis", () => {
      const partialDefinition = {
        ...appSummaryDefinition,
        template: PARTIAL_ANALYSIS_TEMPLATE,
      };
      const rendered = renderPrompt(partialDefinition, testContent);

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });
  });

  describe("Template consolidation", () => {
    it("should export ANALYSIS_PROMPT_TEMPLATE and PARTIAL_ANALYSIS_TEMPLATE", () => {
      expect(ANALYSIS_PROMPT_TEMPLATE).toBeDefined();
      expect(PARTIAL_ANALYSIS_TEMPLATE).toBeDefined();
      expect(typeof ANALYSIS_PROMPT_TEMPLATE).toBe("string");
      expect(typeof PARTIAL_ANALYSIS_TEMPLATE).toBe("string");
    });

    it("should have consistent template structure", () => {
      // All prompts now use the unified ANALYSIS_PROMPT_TEMPLATE structure
      // jsonSchema and forceJSON are now consolidated into schemaSection
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{content}}");
      // partialAnalysisNote is handled via PARTIAL_ANALYSIS_TEMPLATE, not as a placeholder
      expect(ANALYSIS_PROMPT_TEMPLATE).not.toContain("{{partialAnalysisNote}}");
    });

    it("should handle reduce template with category key via inline definition", () => {
      // categoryKey is directly embedded in contentDesc, rather than being a placeholder
      const categoryKey = "technologies";
      const reduceDefinition = {
        ...sourceDefinition,
        // Factory would pre-populate contentDesc with the category key
        contentDesc: `Act as a senior developer. You've been provided with data containing '${categoryKey}'...`,
        template: ANALYSIS_PROMPT_TEMPLATE,
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

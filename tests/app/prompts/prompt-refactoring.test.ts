import { renderPrompt } from "../../../src/common/prompts/prompt-renderer";
import type { RenderablePrompt } from "../../../src/common/prompts/prompt.types";
import { z } from "zod";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";

describe("Prompt Refactoring", () => {
  const testDefinition: RenderablePrompt = {
    label: "Test",
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below, return:\n\n{{instructionsText}}.",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    template: ANALYSIS_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE" as const,
    wrapInCodeBlock: true,
  };

  const testContent = "test file content";

  describe("Function-based rendering", () => {
    it("should render prompts correctly with function", () => {
      const rendered = renderPrompt(testDefinition, testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
      expect(rendered).toContain("instruction 1");
      expect(rendered).toContain("instruction 2");
    });

    it("should handle different template types", () => {
      const appSummaryDefinition = {
        ...testDefinition,
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(appSummaryDefinition, testContent);

      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).not.toContain("CODE:");
    });

    it("should handle reduce template with category key via inline definition", () => {
      // categoryKey is directly embedded in contentDesc, rather than being a placeholder
      const categoryKey = "technologies";
      const reduceDefinition = {
        ...testDefinition,
        // Factory would pre-populate contentDesc with the category key
        contentDesc: `Consolidate ${categoryKey} from the data below.`,
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(reduceDefinition, testContent);

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      // No placeholder should exist since factory embeds the value directly
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should handle complex instruction sections with titles", () => {
      const complexDefinition: RenderablePrompt = {
        ...testDefinition,
        instructions: [
          "__Section 1__\npoint 1\npoint 2",
          "point without title",
          "__Section 2__\npoint 3",
        ],
      };
      const rendered = renderPrompt(complexDefinition, testContent);

      expect(rendered).toContain("__Section 1__");
      expect(rendered).toContain("__Section 2__");
      expect(rendered).toContain("point 1");
      expect(rendered).toContain("point 2");
      expect(rendered).toContain("point without title");
      expect(rendered).toContain("point 3");
    });

    it("should use PARTIAL_ANALYSIS_TEMPLATE for partial analysis scenarios", () => {
      // Use PARTIAL_ANALYSIS_TEMPLATE for partial analysis
      const appSummaryDefinition = {
        ...testDefinition,
        template: PARTIAL_ANALYSIS_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(appSummaryDefinition, testContent);

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });

    it("should handle empty additional parameters", () => {
      const rendered = renderPrompt(testDefinition, testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain(testContent);
    });
  });

  describe("Template consolidation", () => {
    it("should export all required templates", () => {
      expect(ANALYSIS_PROMPT_TEMPLATE).toBeDefined();
      expect(PARTIAL_ANALYSIS_TEMPLATE).toBeDefined();
    });

    it("should have consistent template structure", () => {
      // jsonSchema and forceJSON are now consolidated into schemaSection
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{content}}");
      // partialAnalysisNote is handled via PARTIAL_ANALYSIS_TEMPLATE, not as a placeholder
      expect(ANALYSIS_PROMPT_TEMPLATE).not.toContain("{{partialAnalysisNote}}");
    });

    it("should not have any placeholder syntax in rendered output", () => {
      const rendered = renderPrompt(testDefinition, testContent);

      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe("Backward compatibility", () => {
    it("should produce identical output as before refactoring", () => {
      // Test that the constructor produces the same output as the old factory methods
      const sourceDefinition = {
        ...testDefinition,
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: true,
      };
      const appSummaryDefinition = {
        ...testDefinition,
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };

      const sourceRendered = renderPrompt(sourceDefinition, testContent);
      const appSummaryRendered = renderPrompt(appSummaryDefinition, testContent);

      // Verify the structure is correct
      expect(sourceRendered).toContain("CODE:");
      expect(appSummaryRendered).toContain("FILE_SUMMARIES:");

      // Verify no placeholders remain
      expect(sourceRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
      expect(appSummaryRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });
});

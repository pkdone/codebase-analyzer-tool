import { Prompt } from "../../../src/common/prompts/prompt";
import { z } from "zod";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";

describe("Prompt Refactoring", () => {
  const testConfig = {
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below, return:\n\n{{instructionsText}}.",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    dataBlockHeader: "CODE",
    wrapInCodeBlock: true,
  } as const;

  const testPrompt = new Prompt(testConfig, ANALYSIS_PROMPT_TEMPLATE);
  const testContent = "test file content";

  describe("Function-based rendering", () => {
    it("should render prompts correctly with function", () => {
      const rendered = testPrompt.renderPrompt(testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
      expect(rendered).toContain("instruction 1");
      expect(rendered).toContain("instruction 2");
    });

    it("should handle different template types", () => {
      const appSummaryPrompt = new Prompt(
        { ...testConfig, dataBlockHeader: "FILE_SUMMARIES", wrapInCodeBlock: false },
        ANALYSIS_PROMPT_TEMPLATE,
      );
      const rendered = appSummaryPrompt.renderPrompt(testContent);

      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).not.toContain("CODE:");
    });

    it("should handle reduce template with category key via inline definition", () => {
      // categoryKey is directly embedded in contentDesc, rather than being a placeholder
      const categoryKey = "technologies";
      const reducePrompt = new Prompt(
        {
          ...testConfig,
          // Factory would pre-populate contentDesc with the category key
          contentDesc: `Consolidate ${categoryKey} from the data below.`,
          dataBlockHeader: "FRAGMENTED_DATA",
          wrapInCodeBlock: false,
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );
      const rendered = reducePrompt.renderPrompt(testContent);

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      // No placeholder should exist since factory embeds the value directly
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should handle complex instruction sections with titles", () => {
      const complexPrompt = new Prompt(
        {
          ...testConfig,
          instructions: [
            "__Section 1__\npoint 1\npoint 2",
            "point without title",
            "__Section 2__\npoint 3",
          ],
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );
      const rendered = complexPrompt.renderPrompt(testContent);

      expect(rendered).toContain("__Section 1__");
      expect(rendered).toContain("__Section 2__");
      expect(rendered).toContain("point 1");
      expect(rendered).toContain("point 2");
      expect(rendered).toContain("point without title");
      expect(rendered).toContain("point 3");
    });

    it("should use PARTIAL_ANALYSIS_TEMPLATE for partial analysis scenarios", () => {
      // Use PARTIAL_ANALYSIS_TEMPLATE for partial analysis
      const appSummaryPrompt = new Prompt(
        { ...testConfig, dataBlockHeader: "FILE_SUMMARIES", wrapInCodeBlock: false },
        PARTIAL_ANALYSIS_TEMPLATE,
      );
      const rendered = appSummaryPrompt.renderPrompt(testContent);

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });

    it("should handle empty additional parameters", () => {
      const rendered = testPrompt.renderPrompt(testContent);

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
      const rendered = testPrompt.renderPrompt(testContent);

      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe("Backward compatibility", () => {
    it("should produce identical output as before refactoring", () => {
      // Test that the constructor produces the same output as the old factory methods
      const sourcePrompt = new Prompt(
        { ...testConfig, dataBlockHeader: "CODE", wrapInCodeBlock: true },
        ANALYSIS_PROMPT_TEMPLATE,
      );
      const appSummaryPrompt = new Prompt(
        { ...testConfig, dataBlockHeader: "FILE_SUMMARIES", wrapInCodeBlock: false },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const sourceRendered = sourcePrompt.renderPrompt(testContent);
      const appSummaryRendered = appSummaryPrompt.renderPrompt(testContent);

      // Verify the structure is correct
      expect(sourceRendered).toContain("CODE:");
      expect(appSummaryRendered).toContain("FILE_SUMMARIES:");

      // Verify no placeholders remain
      expect(sourceRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
      expect(appSummaryRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });
});

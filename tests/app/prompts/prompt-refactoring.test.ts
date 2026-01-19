import {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt-builders";
import { z } from "zod";

describe("JSONSchemaPrompt Refactoring", () => {
  const testConfig = {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below, return:\n\n{{instructionsText}}.",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    dataBlockHeader: "CODE",
    wrapInCodeBlock: true,
  } as const;

  const testPrompt = new JSONSchemaPrompt(testConfig);
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
      const appSummaryPrompt = new JSONSchemaPrompt({
        ...testConfig,
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      });
      const rendered = appSummaryPrompt.renderPrompt(testContent);

      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).not.toContain("CODE:");
    });

    it("should handle reduce template with category key via inline definition", () => {
      // categoryKey is directly embedded in contentDesc, rather than being a placeholder
      const categoryKey = "technologies";
      const reducePrompt = new JSONSchemaPrompt({
        ...testConfig,
        // Factory would pre-populate contentDesc with the category key
        contentDesc: `Consolidate ${categoryKey} from the data below.`,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      });
      const rendered = reducePrompt.renderPrompt(testContent);

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      // No placeholder should exist since factory embeds the value directly
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should handle complex instruction sections with titles", () => {
      const complexPrompt = new JSONSchemaPrompt({
        ...testConfig,
        instructions: [
          "__Section 1__\npoint 1\npoint 2",
          "point without title",
          "__Section 2__\npoint 3",
        ],
      });
      const rendered = complexPrompt.renderPrompt(testContent);

      expect(rendered).toContain("__Section 1__");
      expect(rendered).toContain("__Section 2__");
      expect(rendered).toContain("point 1");
      expect(rendered).toContain("point 2");
      expect(rendered).toContain("point without title");
      expect(rendered).toContain("point 3");
    });

    it("should use forPartialAnalysis flag for partial analysis scenarios", () => {
      // Use forPartialAnalysis flag for partial analysis
      const appSummaryPrompt = new JSONSchemaPrompt({
        ...testConfig,
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
        forPartialAnalysis: true,
      });
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
    it("should export JSON_SCHEMA_PROMPT_TEMPLATE", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toBeDefined();
    });

    it("should have consistent template structure", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should not have any placeholder syntax in rendered output", () => {
      const rendered = testPrompt.renderPrompt(testContent);

      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe("Backward compatibility", () => {
    it("should produce identical output as before refactoring", () => {
      // Test that the constructor produces the same output as the old factory methods
      const sourcePrompt = new JSONSchemaPrompt({
        ...testConfig,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });
      const appSummaryPrompt = new JSONSchemaPrompt({
        ...testConfig,
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      });

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

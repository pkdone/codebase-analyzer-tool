import {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";
import { z } from "zod";

describe("JSONSchemaPrompt Constructor and Templates", () => {
  const sourceConfig = {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below...",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    dataBlockHeader: "CODE",
    wrapInCodeBlock: true,
  } as const;

  const appSummaryConfig = {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc:
      "Act as a senior developer analyzing the code in an existing application. Based on test content shown below...",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    dataBlockHeader: "FILE_SUMMARIES",
    wrapInCodeBlock: false,
  } as const;

  const sourcePrompt = new JSONSchemaPrompt(sourceConfig);
  const appSummaryPrompt = new JSONSchemaPrompt(appSummaryConfig);

  const testContent = "test file content";

  describe("renderPrompt function", () => {
    it("should render a prompt with JSON_SCHEMA_PROMPT_TEMPLATE for sources", () => {
      const rendered = sourcePrompt.renderPrompt(testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
    });

    it("should render a prompt with JSON_SCHEMA_PROMPT_TEMPLATE for app summaries", () => {
      const rendered = appSummaryPrompt.renderPrompt(testContent);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).toContain(testContent);
    });

    it("should use forPartialAnalysis flag for partial analysis", () => {
      const partialPrompt = new JSONSchemaPrompt({ ...appSummaryConfig, forPartialAnalysis: true });
      const rendered = partialPrompt.renderPrompt(testContent);

      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });
  });

  describe("Template consolidation", () => {
    it("should export JSON_SCHEMA_PROMPT_TEMPLATE", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof JSON_SCHEMA_PROMPT_TEMPLATE).toBe("string");
    });

    it("should have consistent template structure", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should handle reduce template with category key via inline definition", () => {
      // categoryKey is directly embedded in contentDesc, rather than being a placeholder
      const categoryKey = "technologies";
      const reducePrompt = new JSONSchemaPrompt({
        ...sourceConfig,
        // Factory would pre-populate contentDesc with the category key
        contentDesc: `Act as a senior developer. You've been provided with data containing '${categoryKey}'...`,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      });
      const rendered = reducePrompt.renderPrompt(testContent);

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      // No placeholder should exist since factory embeds the value directly
      expect(rendered).not.toContain("{{categoryKey}}");
    });
  });
});

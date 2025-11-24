import { renderPrompt } from "../../src/prompts/prompt";
import { PromptDefinition } from "../../src/prompts/prompt.types";
import { z } from "zod";
import {
  SOURCES_TEMPLATE,
  APP_SUMMARY_TEMPLATE,
  REDUCE_INSIGHTS_TEMPLATE,
} from "../../src/prompts/templates";

describe("Prompt Constructor and Templates", () => {
  const sourceDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    template: SOURCES_TEMPLATE,
  };

  const appSummaryDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
    instructions: ["instruction 1"],
    responseSchema: z.string(),
    template: APP_SUMMARY_TEMPLATE,
  };

  const testContent = "test file content";

  describe("renderPrompt function", () => {
    it("should render a prompt with SOURCES_TEMPLATE", () => {
      const rendered = renderPrompt(sourceDefinition, { content: testContent });

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
    });

    it("should render a prompt with APP_SUMMARY_TEMPLATE", () => {
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
    it("should export all required templates", () => {
      expect(SOURCES_TEMPLATE).toBeDefined();
      expect(APP_SUMMARY_TEMPLATE).toBeDefined();
      expect(REDUCE_INSIGHTS_TEMPLATE).toBeDefined();
    });

    it("should have consistent template structure", () => {
      expect(SOURCES_TEMPLATE).toContain("{{contentDesc}}");
      expect(SOURCES_TEMPLATE).toContain("{{instructions}}");
      expect(SOURCES_TEMPLATE).toContain("{{jsonSchema}}");
      expect(SOURCES_TEMPLATE).toContain("{{content}}");

      expect(APP_SUMMARY_TEMPLATE).toContain("{{contentDesc}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{instructions}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{jsonSchema}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{content}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{partialAnalysisNote}}");

      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{contentDesc}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{categoryKey}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{jsonSchema}}");
      expect(REDUCE_INSIGHTS_TEMPLATE).toContain("{{content}}");
    });

    it("should handle reduce template with category key replacement", () => {
      const categoryKey = "entities";
      const template = REDUCE_INSIGHTS_TEMPLATE.replace("{{categoryKey}}", categoryKey);
      const reduceDefinition = { ...sourceDefinition, template };
      const rendered = renderPrompt(reduceDefinition, { content: testContent });

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(`'${categoryKey}'`);
      expect(rendered).not.toContain("{{categoryKey}}");
    });
  });
});

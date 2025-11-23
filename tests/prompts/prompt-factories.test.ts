import { zodToJsonSchema } from "zod-to-json-schema";
import { Prompt } from "../../src/prompts/prompt";
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
    instructions: [{ points: ["instruction 1"] }],
    responseSchema: z.string(),
    template: SOURCES_TEMPLATE,
  };

  const appSummaryDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
    instructions: [{ points: ["instruction 1"] }],
    responseSchema: z.string(),
    template: APP_SUMMARY_TEMPLATE,
  };

  const testContent = "test file content";

  describe("Prompt constructor", () => {
    it("should create a prompt with SOURCES_TEMPLATE", () => {
      const prompt = new Prompt(sourceDefinition, testContent);
      const jsonSchemaString = JSON.stringify(
        zodToJsonSchema(sourceDefinition.responseSchema),
        null,
        2,
      );
      const rendered = prompt.render(jsonSchemaString);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
    });

    it("should create a prompt with APP_SUMMARY_TEMPLATE", () => {
      const prompt = new Prompt(appSummaryDefinition, testContent);
      const jsonSchemaString = JSON.stringify(
        zodToJsonSchema(appSummaryDefinition.responseSchema),
        null,
        2,
      );
      const rendered = prompt.render(jsonSchemaString);

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).toContain(testContent);
    });

    it("should handle partialAnalysisNote parameter", () => {
      const prompt = new Prompt(appSummaryDefinition, testContent);
      const partialNote = "This is a partial analysis note";
      const jsonSchemaString = JSON.stringify(
        zodToJsonSchema(appSummaryDefinition.responseSchema),
        null,
        2,
      );
      const rendered = prompt.render(jsonSchemaString, { partialAnalysisNote: partialNote });

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
      const prompt = new Prompt(reduceDefinition, testContent);
      const jsonSchemaString = JSON.stringify(
        zodToJsonSchema(sourceDefinition.responseSchema),
        null,
        2,
      );
      const rendered = prompt.render(jsonSchemaString);

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(`'${categoryKey}'`);
      expect(rendered).not.toContain("{{categoryKey}}");
    });
  });
});

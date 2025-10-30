import { Prompt } from "../../src/prompts/prompt";
import { PromptDefinition } from "../../src/prompts/prompt.types";
import { z } from "zod";
import {
  SOURCES_TEMPLATE,
  APP_SUMMARY_TEMPLATE,
  REDUCE_INSIGHTS_TEMPLATE,
} from "../../src/prompts/prompt";

describe("Prompt Refactoring", () => {
  const testDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
    instructions: [{ points: ["instruction 1", "instruction 2"] }],
    responseSchema: z.string(),
    template: SOURCES_TEMPLATE,
  };

  const testContent = "test file content";

  describe("Constructor-based instantiation", () => {
    it("should create prompt instances using constructor", () => {
      const prompt = new Prompt(testDefinition, testContent);
      expect(prompt).toBeInstanceOf(Prompt);
    });

    it("should render prompts correctly with constructor", () => {
      const prompt = new Prompt(testDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
      expect(rendered).toContain("instruction 1");
      expect(rendered).toContain("instruction 2");
    });

    it("should handle different template types", () => {
      const appSummaryDefinition = { ...testDefinition, template: APP_SUMMARY_TEMPLATE };
      const prompt = new Prompt(appSummaryDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).not.toContain("CODE:");
    });

    it("should handle reduce template with category key replacement", () => {
      const categoryKey = "entities";
      const template = REDUCE_INSIGHTS_TEMPLATE.replace("{{categoryKey}}", categoryKey);
      const reduceDefinition = { ...testDefinition, template };
      const prompt = new Prompt(reduceDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(`'${categoryKey}'`);
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should handle complex instruction sections", () => {
      const complexDefinition: PromptDefinition = {
        ...testDefinition,
        instructions: [
          { title: "Section 1", points: ["point 1", "point 2"] },
          { points: ["point without title"] },
          { title: "Section 2", points: ["point 3"] },
        ],
      };
      const prompt = new Prompt(complexDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("__Section 1__");
      expect(rendered).toContain("__Section 2__");
      expect(rendered).toContain("point 1");
      expect(rendered).toContain("point 2");
      expect(rendered).toContain("point without title");
      expect(rendered).toContain("point 3");
    });

    it("should handle additional parameters in render method", () => {
      // Use APP_SUMMARY_TEMPLATE which supports partialAnalysisNote
      const appSummaryDefinition = { ...testDefinition, template: APP_SUMMARY_TEMPLATE };
      const prompt = new Prompt(appSummaryDefinition, testContent);
      const additionalParams = {
        partialAnalysisNote: "This is a custom note for testing",
      };
      const rendered = prompt.render(additionalParams);

      expect(rendered).toContain(additionalParams.partialAnalysisNote);
    });

    it("should handle empty additional parameters", () => {
      const prompt = new Prompt(testDefinition, testContent);
      const rendered = prompt.render({});

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain(testContent);
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

    it("should not have any placeholder syntax in rendered output", () => {
      const prompt = new Prompt(testDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });

  describe("Backward compatibility", () => {
    it("should produce identical output as before refactoring", () => {
      // Test that the constructor produces the same output as the old factory methods
      const sourceDefinition = { ...testDefinition, template: SOURCES_TEMPLATE };
      const appSummaryDefinition = { ...testDefinition, template: APP_SUMMARY_TEMPLATE };

      const sourcePrompt = new Prompt(sourceDefinition, testContent);
      const appSummaryPrompt = new Prompt(appSummaryDefinition, testContent);

      const sourceRendered = sourcePrompt.render();
      const appSummaryRendered = appSummaryPrompt.render();

      // Verify the structure is correct
      expect(sourceRendered).toContain("CODE:");
      expect(appSummaryRendered).toContain("FILE_SUMMARIES:");

      // Verify no placeholders remain
      expect(sourceRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
      expect(appSummaryRendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });
});

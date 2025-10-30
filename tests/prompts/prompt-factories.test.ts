import { Prompt } from "../../src/prompts/prompt";
import { PromptDefinition } from "../../src/prompts/types/prompt-definition.types";
import { z } from "zod";
import { SOURCES_TEMPLATE } from "../../src/prompts/templates/sources-templates.prompt";
import {
  APP_SUMMARY_TEMPLATE,
  REDUCE_INSIGHTS_TEMPLATE,
} from "../../src/prompts/templates/app-summaries-templates.prompt";

describe("Prompt Factory Methods", () => {
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

  const reduceDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
    instructions: [{ points: ["instruction 1"] }],
    responseSchema: z.string(),
    template: REDUCE_INSIGHTS_TEMPLATE,
  };

  const testContent = "test file content";

  describe("Prompt.forSource", () => {
    it("should create a prompt with SOURCES_TEMPLATE", () => {
      const prompt = Prompt.forSource(sourceDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
    });

    it("should render the same as manual instantiation", () => {
      const factoryPrompt = Prompt.forSource(sourceDefinition, testContent).render();
      const manualPrompt = new Prompt(sourceDefinition, testContent).render();

      expect(factoryPrompt).toBe(manualPrompt);
    });
  });

  describe("Prompt.forAppSummary", () => {
    it("should create a prompt with APP_SUMMARY_TEMPLATE", () => {
      const prompt = Prompt.forAppSummary(appSummaryDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).toContain(testContent);
    });

    it("should render the same as manual instantiation", () => {
      const factoryPrompt = Prompt.forAppSummary(appSummaryDefinition, testContent).render();
      const manualPrompt = new Prompt(appSummaryDefinition, testContent).render();

      expect(factoryPrompt).toBe(manualPrompt);
    });

    it("should handle partialAnalysisNote parameter", () => {
      const prompt = Prompt.forAppSummary(appSummaryDefinition, testContent);
      const partialNote = "This is a partial analysis note";
      const rendered = prompt.render({ partialAnalysisNote: partialNote });

      expect(rendered).toContain(partialNote);
    });
  });

  describe("Prompt.forReduce", () => {
    it("should create a prompt with REDUCE_INSIGHTS_TEMPLATE", () => {
      const categoryKey = "entities";
      const prompt = Prompt.forReduce(reduceDefinition, testContent, categoryKey);
      const rendered = prompt.render();

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      expect(rendered).toContain(testContent);
    });

    it("should replace categoryKey placeholder in template", () => {
      const categoryKey = "technologies";
      const prompt = Prompt.forReduce(reduceDefinition, testContent, categoryKey);
      const rendered = prompt.render();

      expect(rendered).toContain(`'${categoryKey}'`);
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should render the same as manual instantiation", () => {
      const categoryKey = "entities";
      const factoryPrompt = Prompt.forReduce(reduceDefinition, testContent, categoryKey).render();
      // For manual instantiation, we need to replace the categoryKey placeholder ourselves
      const templateWithCategory = reduceDefinition.template.replace(
        "{{categoryKey}}",
        categoryKey,
      );
      const manualDefinition = { ...reduceDefinition, template: templateWithCategory };
      const manualPrompt = new Prompt(manualDefinition, testContent).render();

      expect(factoryPrompt).toBe(manualPrompt);
    });
  });
});

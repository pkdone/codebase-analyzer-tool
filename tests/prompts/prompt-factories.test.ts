import { Prompt } from "../../src/prompts/prompt";
import { PromptDefinition } from "../../src/prompts/types/prompt-definition.types";
import { z } from "zod";
import { SOURCES_TEMPLATE } from "../../src/prompts/templates/sources-templates.prompt";
import {
  APP_SUMMARY_TEMPLATE,
  REDUCE_INSIGHTS_TEMPLATE,
} from "../../src/prompts/templates/app-summaries-templates.prompt";

describe("Prompt Factory Methods", () => {
  const mockDefinition: PromptDefinition = {
    label: "Test",
    contentDesc: "test content",
    instructions: [{ points: ["instruction 1"] }],
    responseSchema: z.string(),
  };

  const testContent = "test file content";

  describe("Prompt.forSource", () => {
    it("should create a prompt with SOURCES_TEMPLATE", () => {
      const prompt = Prompt.forSource(mockDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
    });

    it("should render the same as manual instantiation", () => {
      const factoryPrompt = Prompt.forSource(mockDefinition, testContent).render();
      const manualPrompt = new Prompt(SOURCES_TEMPLATE, mockDefinition, testContent).render();

      expect(factoryPrompt).toBe(manualPrompt);
    });
  });

  describe("Prompt.forAppSummary", () => {
    it("should create a prompt with APP_SUMMARY_TEMPLATE", () => {
      const prompt = Prompt.forAppSummary(mockDefinition, testContent);
      const rendered = prompt.render();

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FILE_SUMMARIES:");
      expect(rendered).toContain(testContent);
    });

    it("should render the same as manual instantiation", () => {
      const factoryPrompt = Prompt.forAppSummary(mockDefinition, testContent).render();
      const manualPrompt = new Prompt(APP_SUMMARY_TEMPLATE, mockDefinition, testContent).render();

      expect(factoryPrompt).toBe(manualPrompt);
    });

    it("should handle partialAnalysisNote parameter", () => {
      const prompt = Prompt.forAppSummary(mockDefinition, testContent);
      const partialNote = "This is a partial analysis note";
      const rendered = prompt.render({ partialAnalysisNote: partialNote });

      expect(rendered).toContain(partialNote);
    });
  });

  describe("Prompt.forReduce", () => {
    it("should create a prompt with REDUCE_INSIGHTS_TEMPLATE", () => {
      const categoryKey = "entities";
      const prompt = Prompt.forReduce(mockDefinition, testContent, categoryKey);
      const rendered = prompt.render();

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain(categoryKey);
      expect(rendered).toContain(testContent);
    });

    it("should replace categoryKey placeholder in template", () => {
      const categoryKey = "technologies";
      const prompt = Prompt.forReduce(mockDefinition, testContent, categoryKey);
      const rendered = prompt.render();

      expect(rendered).toContain(`'${categoryKey}'`);
      expect(rendered).not.toContain("{{categoryKey}}");
    });

    it("should render the same as manual instantiation", () => {
      const categoryKey = "entities";
      const template = REDUCE_INSIGHTS_TEMPLATE.replace("{{categoryKey}}", categoryKey);
      const factoryPrompt = Prompt.forReduce(mockDefinition, testContent, categoryKey).render();
      const manualPrompt = new Prompt(template, mockDefinition, testContent).render();

      expect(factoryPrompt).toBe(manualPrompt);
    });
  });
});

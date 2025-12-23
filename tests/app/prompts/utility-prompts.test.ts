import {
  promptRegistry,
  createReduceInsightsPrompt,
} from "../../../src/app/prompts/prompt-registry";

const codebaseQueryPromptDefinition = promptRegistry.codebaseQuery;
import { CODEBASE_QUERY_TEMPLATE, BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { z } from "zod";

describe("Utility Prompts", () => {
  describe("codebaseQueryPromptDefinition", () => {
    it("should have correct structure", () => {
      expect(codebaseQueryPromptDefinition.label).toBe("Codebase Query");
      expect(codebaseQueryPromptDefinition.contentDesc).toContain("source code files");
      expect(codebaseQueryPromptDefinition.template).toBe(CODEBASE_QUERY_TEMPLATE);
      expect(codebaseQueryPromptDefinition.responseSchema).toBeDefined();
    });

    it("should have empty instructions array since template does not use instructionsText", () => {
      // The CODEBASE_QUERY_TEMPLATE doesn't use {{instructionsText}} placeholder,
      // so the instructions array should be empty to avoid redundancy
      expect(codebaseQueryPromptDefinition.instructions).toEqual([]);
      expect(codebaseQueryPromptDefinition.instructions).toHaveLength(0);
    });

    it("template should contain the complete instruction", () => {
      // The codebase query uses a custom template that contains all instructions
      // since it doesn't follow the standard BASE_PROMPT_TEMPLATE structure
      const template = codebaseQueryPromptDefinition.template;
      expect(template).toContain("Act as a senior developer");
      expect(template).toContain("source code files");
      expect(template).toContain("QUESTION");
      expect(template).toContain("CODE");
      expect(template).toContain("specific evidence in the provided code");
    });

    it("should render correctly with renderPrompt function", () => {
      const testContent = "const x = 1;";
      const testQuestion = "What does this code do?";
      const rendered = renderPrompt(codebaseQueryPromptDefinition, {
        question: testQuestion,
        content: testContent,
      });

      expect(rendered).toContain("Act as a senior developer");
      expect(rendered).toContain("QUESTION:");
      expect(rendered).toContain(testQuestion);
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should use CODEBASE_QUERY_TEMPLATE", () => {
      expect(codebaseQueryPromptDefinition.template).toBe(CODEBASE_QUERY_TEMPLATE);
    });
  });

  describe("createReduceInsightsPrompt factory", () => {
    it("should create a prompt with the correct structure", () => {
      const schema = z.object({
        entities: z.array(z.object({ name: z.string() })),
      });

      const reducePrompt = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(reducePrompt.label).toBe("Reduce Insights");
      expect(reducePrompt.contentDesc).toContain("several JSON objects");
      expect(reducePrompt.contentDesc).toContain("technologies"); // categoryKey is baked in
      expect(reducePrompt.template).toBe(BASE_PROMPT_TEMPLATE);
      expect(reducePrompt.dataBlockHeader).toBe("FRAGMENTED_DATA");
      expect(reducePrompt.responseSchema).toBe(schema);
      expect(reducePrompt.instructions).toHaveLength(1);
      expect(reducePrompt.instructions[0]).toContain("technologies"); // categoryKey is baked in
    });

    it("should render correctly with the factory-created prompt", () => {
      const responseSchema = z.object({
        boundedContexts: z.array(z.object({ name: z.string() })),
      });

      const reducePrompt = createReduceInsightsPrompt(
        "boundedContexts",
        "boundedContexts",
        responseSchema,
      );
      const testContent = '{"boundedContexts": [{"name": "Test"}]}';

      const rendered = renderPrompt(reducePrompt, { content: testContent });

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain("'boundedContexts'");
      expect(rendered).toContain(testContent);
      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should use BASE_PROMPT_TEMPLATE", () => {
      const schema = z.object({ technologies: z.array(z.string()) });
      const reducePrompt = createReduceInsightsPrompt("technologies", "technologies", schema);

      expect(reducePrompt.template).toBe(BASE_PROMPT_TEMPLATE);
    });

    it("should handle different category keys in factory", () => {
      const labels = ["technologies", "boundedContexts", "businessProcesses"];
      labels.forEach((categoryKey) => {
        const schema = z.object({ [categoryKey]: z.array(z.string()) });
        const reducePrompt = createReduceInsightsPrompt(
          categoryKey as "technologies" | "boundedContexts" | "businessProcesses",
          categoryKey,
          schema,
        );

        const rendered = renderPrompt(reducePrompt, { content: "{}" });
        expect(rendered).toContain(`'${categoryKey}'`);
      });
    });
  });
});

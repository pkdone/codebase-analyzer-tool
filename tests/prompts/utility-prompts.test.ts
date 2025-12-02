import {
  codebaseQueryPromptDefinition,
  createReduceInsightsPromptDefinition,
} from "../../src/prompts/definitions/utility-prompts";
import { CODEBASE_QUERY_TEMPLATE, BASE_PROMPT_TEMPLATE } from "../../src/prompts/templates";
import { renderPrompt } from "../../src/prompts/prompt-renderer";
import { z } from "zod";

describe("Utility Prompts", () => {
  describe("codebaseQueryPromptDefinition", () => {
    it("should have correct structure", () => {
      expect(codebaseQueryPromptDefinition.label).toBe("Codebase Query");
      expect(codebaseQueryPromptDefinition.contentDesc).toBe("source code files");
      expect(codebaseQueryPromptDefinition.template).toBe(CODEBASE_QUERY_TEMPLATE);
      expect(codebaseQueryPromptDefinition.responseSchema).toBeDefined();
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

  describe("createReduceInsightsPromptDefinition", () => {
    it("should create a valid prompt definition", () => {
      const categoryLabel = "Entities";
      const responseSchema = z.object({
        entities: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          }),
        ),
      });

      const definition = createReduceInsightsPromptDefinition(categoryLabel, responseSchema);

      expect(definition.label).toBe("Reduce Entities");
      expect(definition.contentDesc).toBe("several JSON objects");
      expect(definition.template).toBe(BASE_PROMPT_TEMPLATE);
      expect(definition.responseSchema).toBe(responseSchema);
      expect(definition.instructions).toHaveLength(1);
      expect(definition.instructions[0]).toContain("a consolidated list of 'Entities'");
    });

    it("should render correctly with categoryKey parameter", () => {
      const categoryLabel = "Aggregates";
      const responseSchema = z.object({
        aggregates: z.array(z.object({ name: z.string() })),
      });

      const definition = createReduceInsightsPromptDefinition(categoryLabel, responseSchema);
      const testContent = '{"aggregates": [{"name": "Test"}]}';
      const rendered = renderPrompt(definition, {
        categoryKey: "aggregates",
        content: testContent,
      });

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain("'aggregates'");
      expect(rendered).toContain(testContent);
      expect(rendered).not.toMatch(/\{\{categoryKey\}\}/);
      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should use BASE_PROMPT_TEMPLATE", () => {
      const definition = createReduceInsightsPromptDefinition("Test", z.string());
      expect(definition.template).toBe(BASE_PROMPT_TEMPLATE);
    });

    it("should handle different category labels correctly", () => {
      const labels = ["Entities", "Aggregates", "Bounded Contexts"];
      labels.forEach((label) => {
        const definition = createReduceInsightsPromptDefinition(label, z.string());
        expect(definition.instructions[0]).toContain(`'${label}'`);
      });
    });
  });
});

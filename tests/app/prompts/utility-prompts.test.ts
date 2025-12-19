import { promptRegistry } from "../../../src/app/prompts/prompt-registry";

const codebaseQueryPromptDefinition = promptRegistry.codebaseQuery;
// createReduceInsightsPromptDefinition no longer exists - it's now a static prompt in the registry
const reduceInsightsPromptDefinition = promptRegistry.reduceInsights;
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

  describe("reduceInsightsPromptDefinition", () => {
    it("should have the correct static structure", () => {
      expect(reduceInsightsPromptDefinition.label).toBe("Reduce Insights");
      expect(reduceInsightsPromptDefinition.contentDesc).toContain("several JSON objects");
      expect(reduceInsightsPromptDefinition.contentDesc).toContain("{{categoryKey}}");
      expect(reduceInsightsPromptDefinition.template).toBe(BASE_PROMPT_TEMPLATE);
      expect(reduceInsightsPromptDefinition.dataBlockHeader).toBe("FRAGMENTED_DATA");
      expect(reduceInsightsPromptDefinition.responseSchema).toBeDefined();
      expect(reduceInsightsPromptDefinition.instructions).toHaveLength(1);
      expect(reduceInsightsPromptDefinition.instructions[0]).toContain("{{categoryKey}}");
    });

    it("should render correctly with categoryKey parameter and schema override", () => {
      const responseSchema = z.object({
        aggregates: z.array(z.object({ name: z.string() })),
      });

      const testContent = '{"aggregates": [{"name": "Test"}]}';
      const rendered = renderPrompt(
        reduceInsightsPromptDefinition,
        {
          categoryKey: "aggregates",
          content: testContent,
        },
        { overrideSchema: responseSchema },
      );

      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain("'aggregates'");
      expect(rendered).toContain(testContent);
      expect(rendered).not.toMatch(/\{\{categoryKey\}\}/);
      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should use BASE_PROMPT_TEMPLATE", () => {
      expect(reduceInsightsPromptDefinition.template).toBe(BASE_PROMPT_TEMPLATE);
    });

    it("should handle different category keys in rendering", () => {
      const labels = ["entities", "aggregates", "boundedContexts"];
      labels.forEach((categoryKey) => {
        const rendered = renderPrompt(
          reduceInsightsPromptDefinition,
          {
            categoryKey,
            content: "{}",
          },
          { overrideSchema: z.object({ [categoryKey]: z.array(z.string()) }) },
        );
        expect(rendered).toContain(`'${categoryKey}'`);
      });
    });
  });
});

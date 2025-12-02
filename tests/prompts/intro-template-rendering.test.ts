import { renderPrompt } from "../../src/prompts/prompt-renderer";
import { z } from "zod";
import { BASE_PROMPT_TEMPLATE } from "../../src/prompts/templates";

describe("Intro Template Rendering", () => {
  describe("introTextTemplate rendering", () => {
    it("should render introTextTemplate with placeholders", () => {
      const definition = {
        introTextTemplate:
          "Analyze the {{contentDesc}} shown in the section marked '{{dataBlockHeader}}'.",
        instructions: ["Extract metadata"],
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, {
        contentDesc: "Java code",
        content: "test content",
      });

      expect(rendered).toContain("Analyze the Java code shown in the section marked 'CODE'");
    });

    it("should render introTextTemplate with instructionsText placeholder", () => {
      const definition = {
        introTextTemplate: "Based on the code below, return {{instructionsText}}.",
        instructions: ["class name", "purpose"],
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, { content: "test content" });

      expect(rendered).toContain("return class name");
      expect(rendered).toContain("purpose");
    });

    it("should render introTextTemplate with categoryKey for reduce prompts", () => {
      const definition = {
        introTextTemplate: "Consolidate the list of '{{categoryKey}}' from {{dataBlockHeader}}.",
        instructions: ["consolidated list"],
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA" as const,
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, {
        categoryKey: "entities",
        content: "test data",
      });

      expect(rendered).toContain("Consolidate the list of 'entities'");
      expect(rendered).toContain("FRAGMENTED_DATA");
    });

    it("should handle missing placeholder data gracefully", () => {
      const definition = {
        introTextTemplate: "Simple intro without placeholders",
        instructions: ["test"],
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(definition, { content: "test content" });

      expect(rendered).toContain("Simple intro without placeholders");
      expect(rendered).toContain("CODE:");
    });
  });
});

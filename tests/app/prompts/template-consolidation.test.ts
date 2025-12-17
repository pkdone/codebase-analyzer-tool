import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { z } from "zod";

describe("Template Consolidation", () => {
  describe("BASE_PROMPT_TEMPLATE", () => {
    it("should be defined and exported", () => {
      expect(BASE_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof BASE_PROMPT_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders for unified template", () => {
      // Unified template uses introText, dataBlockHeader, and contentWrapper
      expect(BASE_PROMPT_TEMPLATE).toContain("{{introText}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{jsonSchema}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{forceJSON}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{contentWrapper}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should render correctly with sources configuration", () => {
      const definition = {
        introTextTemplate:
          "Act as a senior developer analyzing the code in a legacy application. Based on JVM code shown below...",
        instructions: ["Extract class name"] as const,
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: true,
      };
      const rendered = renderPrompt(definition, { content: "test code" });
      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain("```");
    });

    it("should render correctly with app summary configuration", () => {
      const definition = {
        introTextTemplate:
          "Act as a senior developer analyzing the code in a legacy application. Based on source file summaries shown below...",
        instructions: ["Extract entities"] as const,
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(definition, { content: "test summaries" });
      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FILE_SUMMARIES:");
      // JSON schema section has code blocks, but content section should not
      expect(rendered).toContain("```json"); // JSON schema code block is expected
      // Content should not be wrapped in code blocks (no ``` before/after "test summaries")
      const contentIndex = rendered.indexOf("test summaries");
      const beforeContent = rendered.substring(Math.max(0, contentIndex - 10), contentIndex);
      expect(beforeContent).not.toContain("```");
    });

    it("should not contain any undefined placeholders", () => {
      // Check that all placeholders are properly formatted
      const placeholderRegex = /\{\{[^}]+\}\}/g;
      const placeholders = BASE_PROMPT_TEMPLATE.match(placeholderRegex) ?? [];

      const expectedPlaceholders = [
        "{{introText}}",
        "{{dataBlockHeader}}",
        "{{jsonSchema}}",
        "{{forceJSON}}",
        "{{content}}",
        "{{contentWrapper}}",
        "{{partialAnalysisNote}}",
      ];

      placeholders.forEach((placeholder: string) => {
        expect(expectedPlaceholders).toContain(placeholder);
      });
    });

    it("should support partial analysis note", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain(
        "{{partialAnalysisNote}}The JSON response must follow this JSON schema:",
      );
    });

    it("should render correctly with reduce configuration", () => {
      const definition = {
        introTextTemplate:
          "Act as a senior developer analyzing the code in a legacy application. You've been provided with several JSON objects containing '{{categoryKey}}'. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object.",
        instructions: ["a consolidated list"] as const,
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(definition, { categoryKey: "entities", content: "test data" });
      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("FRAGMENTED_DATA:");
      expect(rendered).toContain("entities");
      expect(rendered).toContain("consolidate these lists into a single, de-duplicated");
    });
  });

  describe("Template Consistency", () => {
    it("should have consistent JSON schema formatting", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain("```json");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{jsonSchema}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("```");
    });

    it("should have consistent force JSON formatting", () => {
      expect(BASE_PROMPT_TEMPLATE).toContain("{{forceJSON}}");
    });
  });

  describe("Template Usage", () => {
    it("should be usable in Prompt class", () => {
      const mockDefinition = {
        introTextTemplate: "Test intro template with test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: true,
      };

      // This should not throw an error
      expect(() => {
        renderPrompt(mockDefinition, { content: "test" });
      }).not.toThrow();
    });
  });
});

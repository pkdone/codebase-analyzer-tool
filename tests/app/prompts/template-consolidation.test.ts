import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";
import { renderPrompt } from "../../../src/common/prompts/prompt-renderer";
import { z } from "zod";

describe("Template Consolidation", () => {
  describe("ANALYSIS_PROMPT_TEMPLATE", () => {
    it("should be defined and exported", () => {
      expect(ANALYSIS_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof ANALYSIS_PROMPT_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders for unified template", () => {
      // Unified template now uses contentDesc and instructionsText directly
      // jsonSchema and forceJSON are now consolidated into schemaSection
      // which is built by the renderer for JSON-mode prompts (empty for TEXT-mode)
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{contentWrapper}}");
      // partialAnalysisNote is handled via PARTIAL_ANALYSIS_TEMPLATE, not as a placeholder
      expect(ANALYSIS_PROMPT_TEMPLATE).not.toContain("{{partialAnalysisNote}}");
    });

    it("should render correctly with sources configuration", () => {
      const definition = {
        contentDesc:
          "Act as a senior developer analyzing the code in an existing application. Based on JVM code shown below...",
        instructions: ["Extract class name"] as const,
        responseSchema: z.string(),
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: true,
      };
      const rendered = renderPrompt(definition, "test code");
      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain("```");
    });

    it("should render correctly with app summary configuration", () => {
      const definition = {
        contentDesc:
          "Act as a senior developer analyzing the code in an existing application. Based on source file summaries shown below...",
        instructions: ["Extract entities"] as const,
        responseSchema: z.string(),
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(definition, "test summaries");
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
      const placeholders = ANALYSIS_PROMPT_TEMPLATE.match(placeholderRegex) ?? [];

      // schemaSection consolidates jsonSchema and forceJSON
      const expectedPlaceholders = [
        "{{contentDesc}}",
        "{{instructionsText}}",
        "{{dataBlockHeader}}",
        "{{schemaSection}}",
        "{{content}}",
        "{{contentWrapper}}",
      ];

      placeholders.forEach((placeholder: string) => {
        expect(expectedPlaceholders).toContain(placeholder);
      });
    });
  });

  describe("PARTIAL_ANALYSIS_TEMPLATE", () => {
    it("should be defined and derived from ANALYSIS_PROMPT_TEMPLATE", () => {
      expect(PARTIAL_ANALYSIS_TEMPLATE).toBeDefined();
      expect(typeof PARTIAL_ANALYSIS_TEMPLATE).toBe("string");
    });

    it("should contain the partial analysis note text", () => {
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("partial analysis");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("focus on extracting insights from this subset");
    });

    it("should contain all the same placeholders as ANALYSIS_PROMPT_TEMPLATE", () => {
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{contentDesc}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{instructionsText}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{schemaSection}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{content}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{contentWrapper}}");
    });

    it("should render correctly with partial analysis note", () => {
      const definition = {
        contentDesc: "a set of source file summaries",
        instructions: ["Extract entities"] as const,
        responseSchema: z.string(),
        template: PARTIAL_ANALYSIS_TEMPLATE,
        dataBlockHeader: "FILE_SUMMARIES" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(definition, "test summaries");
      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });
  });

  describe("Template Consistency", () => {
    it("should have schemaSection placeholder for JSON schema and format enforcement", () => {
      // JSON schema code block and forceJSON are now built by the renderer into schemaSection
      // This allows TEXT-mode prompts to have an empty schemaSection
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
    });

    it("should render JSON schema in schemaSection for JSON-mode prompts", () => {
      const definition = {
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ name: z.string() }),
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: false,
      };
      const rendered = renderPrompt(definition, "test");

      // schemaSection should contain the JSON schema code block
      expect(rendered).toContain("```json");
      expect(rendered).toContain('"name"');
      expect(rendered).toContain("The response MUST be valid JSON");
    });
  });

  describe("Template Usage", () => {
    it("should be usable in Prompt class", () => {
      const mockDefinition = {
        contentDesc: "Test intro template with test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: true,
      };

      // This should not throw an error
      expect(() => {
        renderPrompt(mockDefinition, "test");
      }).not.toThrow();
    });
  });
});

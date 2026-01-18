import {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";
import { z } from "zod";

describe("Template Consolidation", () => {
  describe("JSON_SCHEMA_PROMPT_TEMPLATE", () => {
    it("should be defined and exported", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof JSON_SCHEMA_PROMPT_TEMPLATE).toBe("string");
    });

    it("should contain expected placeholders for unified template", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentWrapper}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should render correctly with sources configuration", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc:
          "Act as a senior developer analyzing the code in an existing application. Based on JVM code shown below...",
        instructions: ["Extract class name"] as const,
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });
      const rendered = prompt.renderPrompt("test code");
      expect(rendered).toContain("Act as a senior developer analyzing the code");
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain("```");
    });

    it("should render correctly with app summary configuration", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc:
          "Act as a senior developer analyzing the code in an existing application. Based on source file summaries shown below...",
        instructions: ["Extract entities"] as const,
        responseSchema: z.string(),
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      });
      const rendered = prompt.renderPrompt("test summaries");
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
      const placeholders = JSON_SCHEMA_PROMPT_TEMPLATE.match(placeholderRegex) ?? [];

      const expectedPlaceholders = [
        "{{personaIntroduction}}",
        "{{contentDesc}}",
        "{{instructionsText}}",
        "{{dataBlockHeader}}",
        "{{partialAnalysisNote}}",
        "{{schemaSection}}",
        "{{content}}",
        "{{contentWrapper}}",
      ];

      placeholders.forEach((placeholder: string) => {
        expect(expectedPlaceholders).toContain(placeholder);
      });
    });
  });

  describe("forPartialAnalysis flag", () => {
    it("should include partial analysis note when forPartialAnalysis is true", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "a set of source file summaries",
        instructions: ["Extract entities"] as const,
        responseSchema: z.string(),
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
        forPartialAnalysis: true,
      });
      const rendered = prompt.renderPrompt("test summaries");
      expect(rendered).toContain("partial analysis");
      expect(rendered).toContain("focus on extracting insights from this subset");
    });

    it("should NOT include partial analysis note when forPartialAnalysis is false", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "a set of source file summaries",
        instructions: ["Extract entities"] as const,
        responseSchema: z.string(),
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
        forPartialAnalysis: false,
      });
      const rendered = prompt.renderPrompt("test summaries");
      expect(rendered).not.toContain("partial analysis");
    });
  });

  describe("Template Consistency", () => {
    it("should have schemaSection placeholder for JSON schema and format enforcement", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
    });

    it("should render JSON schema in schemaSection for JSON-mode prompts", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["test instruction"],
        responseSchema: z.object({ name: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });
      const rendered = prompt.renderPrompt("test");

      // schemaSection should contain the JSON schema code block
      expect(rendered).toContain("```json");
      expect(rendered).toContain('"name"');
      expect(rendered).toContain("The response MUST be valid JSON");
    });
  });

  describe("Template Usage", () => {
    it("should be usable in JSONSchemaPrompt class", () => {
      const prompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "Test intro template with test content",
        instructions: ["test instruction"],
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      });

      // This should not throw an error
      expect(() => {
        prompt.renderPrompt("test");
      }).not.toThrow();
    });
  });
});

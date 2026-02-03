/**
 * Tests for JSONSchemaPrompt class and exported constants.
 */

import { z } from "zod";
import {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
  FORCE_JSON_FORMAT_INSTRUCTIONS,
} from "../../../src/common/prompts/json-schema-prompt";

describe("JSONSchemaPrompt constants", () => {
  describe("JSON_SCHEMA_PROMPT_TEMPLATE", () => {
    it("should be defined as a non-empty string", () => {
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toBeDefined();
      expect(typeof JSON_SCHEMA_PROMPT_TEMPLATE).toBe("string");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE.length).toBeGreaterThan(0);
    });

    it("should contain all required placeholders", () => {
      const requiredPlaceholders = [
        "{{personaIntroduction}}",
        "{{contentDesc}}",
        "{{dataBlockHeader}}",
        "{{instructionsText}}",
        "{{contextNote}}",
        "{{schemaSection}}",
        "{{content}}",
        "{{contentWrapper}}",
      ];

      requiredPlaceholders.forEach((placeholder) => {
        expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain(placeholder);
      });
    });
  });

  describe("FORCE_JSON_FORMAT_INSTRUCTIONS", () => {
    it("should be defined as a non-empty string", () => {
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).toBeDefined();
      expect(typeof FORCE_JSON_FORMAT_INSTRUCTIONS).toBe("string");
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS.length).toBeGreaterThan(0);
    });

    it("should contain critical JSON formatting requirements", () => {
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).toContain("valid JSON");
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).toContain("property names must be quoted");
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).toContain("markdown code fences");
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).toContain("ASCII only");
    });

    it("should not contain any template placeholders", () => {
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should include guidance on escape characters", () => {
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).toContain("Escape control characters");
      expect(FORCE_JSON_FORMAT_INSTRUCTIONS).toContain("\\uXXXX");
    });
  });
});

describe("JSONSchemaPrompt class", () => {
  const testSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  const baseConfig = {
    personaIntroduction: "Act as a test analyzer.",
    contentDesc: "test data",
    instructions: ["Extract the name", "Extract the value"],
    responseSchema: testSchema,
    dataBlockHeader: "TEST_DATA",
    wrapInCodeBlock: false,
  };

  describe("constructor", () => {
    it("should initialize all properties from config", () => {
      const prompt = new JSONSchemaPrompt(baseConfig);

      expect(prompt.personaIntroduction).toBe(baseConfig.personaIntroduction);
      expect(prompt.contentDesc).toBe(baseConfig.contentDesc);
      expect(prompt.instructions).toEqual(baseConfig.instructions);
      expect(prompt.responseSchema).toBe(testSchema);
      expect(prompt.dataBlockHeader).toBe(baseConfig.dataBlockHeader);
      expect(prompt.wrapInCodeBlock).toBe(baseConfig.wrapInCodeBlock);
      expect(prompt.contextNote).toBe("");
    });

    it("should use provided contextNote when specified", () => {
      const contextNote = "This is a context note.\n\n";
      const prompt = new JSONSchemaPrompt({ ...baseConfig, contextNote });

      expect(prompt.contextNote).toBe(contextNote);
    });
  });

  describe("renderPrompt", () => {
    it("should render a prompt with all template values filled", () => {
      const prompt = new JSONSchemaPrompt(baseConfig);
      const rendered = prompt.renderPrompt("sample content");

      expect(rendered).toContain(baseConfig.personaIntroduction);
      expect(rendered).toContain(baseConfig.contentDesc);
      expect(rendered).toContain("Extract the name");
      expect(rendered).toContain("Extract the value");
      expect(rendered).toContain("TEST_DATA:");
      expect(rendered).toContain("sample content");
      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should include JSON schema in rendered prompt", () => {
      const prompt = new JSONSchemaPrompt(baseConfig);
      const rendered = prompt.renderPrompt("content");

      expect(rendered).toContain("JSON schema");
      expect(rendered).toContain('"name"');
      expect(rendered).toContain('"value"');
    });

    it("should include FORCE_JSON_FORMAT_INSTRUCTIONS in rendered prompt", () => {
      const prompt = new JSONSchemaPrompt(baseConfig);
      const rendered = prompt.renderPrompt("content");

      expect(rendered).toContain("valid JSON");
      expect(rendered).toContain("property names must be quoted");
    });

    it("should wrap content in code blocks when wrapInCodeBlock is true", () => {
      const prompt = new JSONSchemaPrompt({ ...baseConfig, wrapInCodeBlock: true });
      const rendered = prompt.renderPrompt("test content");

      // Should have 4 code blocks: 2 for JSON schema, 2 for content
      const codeBlockCount = (rendered.match(/```/g) ?? []).length;
      expect(codeBlockCount).toBe(4);
    });

    it("should NOT wrap content in code blocks when wrapInCodeBlock is false", () => {
      const prompt = new JSONSchemaPrompt({ ...baseConfig, wrapInCodeBlock: false });
      const rendered = prompt.renderPrompt("test content");

      // Should have 2 code blocks: only for JSON schema
      const codeBlockCount = (rendered.match(/```/g) ?? []).length;
      expect(codeBlockCount).toBe(2);
    });

    it("should include contextNote when provided", () => {
      const contextNote = "This is a partial analysis.\n\n";
      const prompt = new JSONSchemaPrompt({ ...baseConfig, contextNote });
      const rendered = prompt.renderPrompt("content");

      expect(rendered).toContain("This is a partial analysis.");
    });

    it("should position contextNote before the JSON schema section", () => {
      const contextNote = "CONTEXT_MARKER\n\n";
      const prompt = new JSONSchemaPrompt({ ...baseConfig, contextNote });
      const rendered = prompt.renderPrompt("content");

      const contextIndex = rendered.indexOf("CONTEXT_MARKER");
      const schemaIndex = rendered.indexOf("JSON schema");

      expect(contextIndex).toBeLessThan(schemaIndex);
    });

    it("should join multiple instructions with double newlines", () => {
      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        instructions: ["First instruction", "Second instruction", "Third instruction"],
      });
      const rendered = prompt.renderPrompt("content");

      expect(rendered).toContain("First instruction\n\nSecond instruction\n\nThird instruction");
    });
  });

  describe("schema types", () => {
    it("should work with complex nested schemas", () => {
      const complexSchema = z.object({
        users: z.array(
          z.object({
            id: z.number(),
            name: z.string(),
            roles: z.array(z.string()),
          }),
        ),
        metadata: z.object({
          version: z.string(),
          timestamp: z.number(),
        }),
      });

      const prompt = new JSONSchemaPrompt({
        ...baseConfig,
        responseSchema: complexSchema,
      });

      const rendered = prompt.renderPrompt("content");

      expect(rendered).toContain('"users"');
      expect(rendered).toContain('"metadata"');
      expect(rendered).toContain('"roles"');
    });

    it("should preserve the response schema reference", () => {
      const prompt = new JSONSchemaPrompt(baseConfig);

      expect(prompt.responseSchema).toBe(testSchema);
    });
  });
});

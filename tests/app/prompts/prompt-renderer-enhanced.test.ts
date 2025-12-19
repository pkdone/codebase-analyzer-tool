import { z } from "zod";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";
import { type PromptDefinition } from "../../../src/app/prompts/prompt.types";

describe("Enhanced Prompt Renderer", () => {
  const baseSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  const testPromptDefinition: PromptDefinition = {
    label: "Test Prompt",
    contentDesc: "test content",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: baseSchema,
    template: BASE_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
  };

  describe("Backward Compatibility (no options)", () => {
    it("should render prompt without options parameter", () => {
      const result = renderPrompt(testPromptDefinition, {
        content: "sample code",
      });

      expect(result).toContain("test content");
      expect(result).toContain("sample code");
      expect(result).toContain("instruction 1");
      expect(result).toContain("instruction 2");
    });

    it("should use definition's responseSchema when no override provided", () => {
      const result = renderPrompt(testPromptDefinition, {
        content: "sample code",
      });

      // The result should contain the JSON schema from the definition's responseSchema
      expect(result).toContain('"name"');
      expect(result).toContain('"value"');
      expect(result).toContain('"type": "object"');
    });
  });

  describe("Schema Override", () => {
    it("should override schema when provided in options", () => {
      const overrideSchema = z.object({
        title: z.string(),
        count: z.number(),
      });

      const result = renderPrompt(
        testPromptDefinition,
        { content: "sample code" },
        { overrideSchema },
      );

      // Should contain properties from override schema
      expect(result).toContain('"title"');
      expect(result).toContain('"count"');

      // Should NOT contain properties from original schema in the JSON schema section
      // Extract just the JSON schema portion to avoid false positives from FORCE_JSON_FORMAT text
      const schemaRegex = /```json\n([\s\S]*?)\n```/;
      const schemaMatch = schemaRegex.exec(result);
      expect(schemaMatch).toBeTruthy();
      const schemaSection = schemaMatch![1];
      expect(schemaSection).not.toContain('"name":');
      expect(schemaSection).not.toContain('"value":');
    });

    it("should not mutate the original definition when overriding schema", () => {
      const overrideSchema = z.object({
        different: z.string(),
      });

      renderPrompt(testPromptDefinition, { content: "sample code" }, { overrideSchema });

      // Original definition should remain unchanged
      expect(testPromptDefinition.responseSchema).toBe(baseSchema);
    });

    it("should work with complex override schemas", () => {
      const complexSchema = z.object({
        items: z.array(
          z.object({
            id: z.string(),
            metadata: z.object({
              created: z.string(),
              updated: z.string(),
            }),
          }),
        ),
        total: z.number(),
      });

      const result = renderPrompt(
        testPromptDefinition,
        { content: "sample code" },
        { overrideSchema: complexSchema },
      );

      expect(result).toContain('"items"');
      expect(result).toContain('"metadata"');
      expect(result).toContain('"total"');
    });

    it("should handle z.unknown() as override schema", () => {
      const unknownSchema = z.unknown();

      const result = renderPrompt(
        testPromptDefinition,
        { content: "sample code" },
        { overrideSchema: unknownSchema },
      );

      // Should still render a valid prompt
      expect(result).toContain("sample code");
      expect(result).toContain("instruction 1");
    });
  });

  describe("Dynamic Content with Schema Override", () => {
    it("should handle placeholder replacement along with schema override", () => {
      const promptWithPlaceholder: PromptDefinition = {
        label: "Dynamic Prompt",
        contentDesc: "data for {{categoryKey}}",
        instructions: ["process {{categoryKey}}"],
        responseSchema: z.unknown(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      };

      const overrideSchema = z.object({
        entities: z.array(z.object({ name: z.string() })),
      });

      const result = renderPrompt(
        promptWithPlaceholder,
        { content: "sample data", categoryKey: "entities" },
        { overrideSchema },
      );

      // Should replace placeholders
      expect(result).toContain("data for entities");
      expect(result).toContain("process entities");

      // Should use override schema
      expect(result).toContain('"entities"');
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty options object", () => {
      const result = renderPrompt(testPromptDefinition, { content: "sample code" }, {});

      // Should behave same as no options (use definition's schema)
      expect(result).toContain('"name"');
      expect(result).toContain('"value"');
    });

    it("should handle undefined overrideSchema", () => {
      const result = renderPrompt(
        testPromptDefinition,
        { content: "sample code" },
        { overrideSchema: undefined },
      );

      // Should use definition's schema
      expect(result).toContain('"name"');
      expect(result).toContain('"value"');
    });

    it("should work with primitive schemas as override", () => {
      const stringSchema = z.string();

      const result = renderPrompt(
        testPromptDefinition,
        { content: "sample code" },
        { overrideSchema: stringSchema },
      );

      expect(result).toContain('"type": "string"');
      // Extract JSON schema section to avoid false positives
      const schemaRegex = /```json\n([\s\S]*?)\n```/;
      const schemaMatch = schemaRegex.exec(result);
      expect(schemaMatch).toBeTruthy();
      const schemaSection = schemaMatch![1];
      expect(schemaSection).not.toContain('"name":');
    });

    it("should handle array schemas as override", () => {
      const arraySchema = z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      );

      const result = renderPrompt(
        testPromptDefinition,
        { content: "sample code" },
        { overrideSchema: arraySchema },
      );

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"description"');
    });
  });

  describe("Template Variables", () => {
    it("should preserve all template variables with schema override", () => {
      const result = renderPrompt(
        testPromptDefinition,
        { content: "sample code", partialAnalysisNote: "Note: partial analysis" },
        { overrideSchema: z.object({ test: z.string() }) },
      );

      expect(result).toContain("sample code");
      expect(result).toContain("Note: partial analysis");
      expect(result).toContain("instruction 1");
      expect(result).toContain("CODE:");
    });
  });

  describe("Reduce Insights Use Case", () => {
    it("should properly render reduce insights prompt with category-specific schema", () => {
      const reducePrompt: PromptDefinition = {
        label: "Reduce Insights",
        contentDesc: "objects containing '{{categoryKey}}'",
        instructions: ["consolidate {{categoryKey}}"],
        responseSchema: z.unknown(),
        template: BASE_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      };

      const categorySchema = z.object({
        entities: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          }),
        ),
      });

      const partialData = {
        entities: [{ name: "Entity1", description: "Desc1" }],
      };

      const result = renderPrompt(
        reducePrompt,
        {
          categoryKey: "entities",
          content: JSON.stringify(partialData),
        },
        { overrideSchema: categorySchema },
      );

      // Should replace categoryKey placeholder
      expect(result).toContain("objects containing 'entities'");
      expect(result).toContain("consolidate entities");

      // Should use category-specific schema
      expect(result).toContain('"entities"');
      expect(result).toContain('"type": "array"');

      // Should contain the data
      expect(result).toContain("Entity1");
    });
  });
});

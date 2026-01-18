import { z } from "zod";
import { JSONSchemaPrompt } from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";
import { buildReduceInsightsContentDesc } from "../../../src/app/prompts/app-summaries/app-summaries.fragments";

describe("JSONSchemaPrompt Renderer", () => {
  const baseSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  const testConfig = {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc: "test content",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: baseSchema,
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
  } as const;

  const testPrompt = new JSONSchemaPrompt(testConfig);

  describe("Basic Rendering", () => {
    it("should render prompt with definition schema", () => {
      const result = testPrompt.renderPrompt("sample code");

      expect(result).toContain("test content");
      expect(result).toContain("sample code");
      expect(result).toContain("instruction 1");
      expect(result).toContain("instruction 2");
    });

    it("should use definition's responseSchema for JSON schema generation", () => {
      const result = testPrompt.renderPrompt("sample code");

      // The result should contain the JSON schema from the definition's responseSchema
      expect(result).toContain('"name"');
      expect(result).toContain('"value"');
      expect(result).toContain('"type": "object"');
    });
  });

  describe("Schema Types", () => {
    it("should work with complex schemas", () => {
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

      const complexPrompt = new JSONSchemaPrompt({
        ...testConfig,
        responseSchema: complexSchema,
      });

      const result = complexPrompt.renderPrompt("sample code");

      expect(result).toContain('"items"');
      expect(result).toContain('"metadata"');
      expect(result).toContain('"total"');
    });

    it("should handle z.unknown() schema", () => {
      const unknownPrompt = new JSONSchemaPrompt({
        ...testConfig,
        responseSchema: z.unknown(),
      });

      const result = unknownPrompt.renderPrompt("sample code");

      // Should still render a valid prompt
      expect(result).toContain("sample code");
      expect(result).toContain("instruction 1");
    });

    it("should work with primitive schemas", () => {
      const stringPrompt = new JSONSchemaPrompt({
        ...testConfig,
        responseSchema: z.string(),
      });

      const result = stringPrompt.renderPrompt("sample code");

      expect(result).toContain('"type": "string"');
    });

    it("should handle array schemas", () => {
      const arraySchema = z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      );

      const arrayPrompt = new JSONSchemaPrompt({
        ...testConfig,
        responseSchema: arraySchema,
      });

      const result = arrayPrompt.renderPrompt("sample code");

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"description"');
    });
  });

  describe("Template Variables", () => {
    it("should include all template variables in rendered output with forPartialAnalysis", () => {
      // Use forPartialAnalysis flag to test the partial analysis note
      const promptWithPartialFlag = new JSONSchemaPrompt({
        ...testConfig,
        forPartialAnalysis: true,
      });

      const result = promptWithPartialFlag.renderPrompt("sample code");

      expect(result).toContain("sample code");
      expect(result).toContain("partial analysis");
      expect(result).toContain("instruction 1");
      expect(result).toContain("CODE:");
    });

    it("should render without partial analysis note", () => {
      const result = testPrompt.renderPrompt("sample code");

      // Should render without errors
      expect(result).toContain("sample code");
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("partial analysis");
    });
  });

  describe("Code Block Wrapping", () => {
    it("should wrap content in code blocks when wrapInCodeBlock is true", () => {
      const wrappedPrompt = new JSONSchemaPrompt({
        ...testConfig,
        wrapInCodeBlock: true,
      });

      const result = wrappedPrompt.renderPrompt("sample code");

      // The content should be wrapped with ``` markers
      expect(result).toContain("```\nsample code```");
    });

    it("should not wrap content when wrapInCodeBlock is false", () => {
      const result = testPrompt.renderPrompt("sample code");

      // Content should appear without surrounding ``` markers (except in JSON schema block)
      const contentSection = result.split("CODE:")[1];
      expect(contentSection).not.toMatch(/^```\n/);
    });
  });

  describe("Reduce Insights Use Case", () => {
    it("should properly render reduce insights prompt", () => {
      const categorySchema = z.object({
        technologies: z.array(
          z.object({
            name: z.string(),
            description: z.string(),
          }),
        ),
      });

      // Create a typed prompt definition (JSON mode = responseSchema present)
      const reducePrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: buildReduceInsightsContentDesc("technologies"),
        instructions: [`a consolidated list of 'technologies'`],
        responseSchema: categorySchema,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      });

      const partialData = {
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
      };

      const result = reducePrompt.renderPrompt(JSON.stringify(partialData));

      // Should have categoryKey baked into the prompt definition
      expect(result).toContain("'technologies'");

      // Should use category-specific schema
      expect(result).toContain('"technologies"');
      expect(result).toContain('"type": "array"');

      // Should contain the data
      expect(result).toContain("TypeScript");
    });

    it("should work with different category keys", () => {
      const techSchema = z.object({
        technologies: z.array(z.object({ name: z.string(), version: z.string() })),
      });

      const reducePrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: buildReduceInsightsContentDesc("technologies"),
        instructions: [`a consolidated list of 'technologies'`],
        responseSchema: techSchema,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
      });

      const result = reducePrompt.renderPrompt(
        JSON.stringify({ technologies: [{ name: "TypeScript", version: "5.7" }] }),
      );

      expect(result).toContain("'technologies'");
      expect(result).toContain("TypeScript");
    });
  });

  describe("Data Block Header", () => {
    it("should use the correct dataBlockHeader in output", () => {
      const result = testPrompt.renderPrompt("sample code");
      expect(result).toContain("CODE:");
    });

    it("should handle different dataBlockHeaders", () => {
      const fileSummariesPrompt = new JSONSchemaPrompt({
        ...testConfig,
        dataBlockHeader: "FILE_SUMMARIES",
      });

      const result = fileSummariesPrompt.renderPrompt("summaries");
      expect(result).toContain("FILE_SUMMARIES:");
    });

    it("should handle FRAGMENTED_DATA header", () => {
      const fragmentedPrompt = new JSONSchemaPrompt({
        ...testConfig,
        dataBlockHeader: "FRAGMENTED_DATA",
      });

      const result = fragmentedPrompt.renderPrompt("data");
      expect(result).toContain("FRAGMENTED_DATA:");
    });
  });
});

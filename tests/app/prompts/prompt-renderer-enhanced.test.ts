import { z } from "zod";
import { renderPrompt } from "../../../src/common/prompts/prompt-renderer";
import { buildReduceInsightsContentDesc } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.fragments";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";
import type { RenderablePrompt } from "../../../src/common/prompts/prompt.types";
import { LLMOutputFormat } from "../../../src/common/llm/types/llm.types";

describe("Prompt Renderer", () => {
  const baseSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  const testRenderablePrompt: RenderablePrompt = {
    label: "Test Prompt",
    contentDesc: "test content",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: baseSchema,
    template: ANALYSIS_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
  };

  describe("Basic Rendering", () => {
    it("should render prompt with definition schema", () => {
      const result = renderPrompt(testRenderablePrompt, "sample code");

      expect(result).toContain("test content");
      expect(result).toContain("sample code");
      expect(result).toContain("instruction 1");
      expect(result).toContain("instruction 2");
    });

    it("should use definition's responseSchema for JSON schema generation", () => {
      const result = renderPrompt(testRenderablePrompt, "sample code");

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

      const complexPrompt: RenderablePrompt = {
        ...testRenderablePrompt,
        responseSchema: complexSchema,
      };

      const result = renderPrompt(complexPrompt, "sample code");

      expect(result).toContain('"items"');
      expect(result).toContain('"metadata"');
      expect(result).toContain('"total"');
    });

    it("should handle z.unknown() schema", () => {
      const unknownPrompt: RenderablePrompt = {
        ...testRenderablePrompt,
        responseSchema: z.unknown(),
      };

      const result = renderPrompt(unknownPrompt, "sample code");

      // Should still render a valid prompt
      expect(result).toContain("sample code");
      expect(result).toContain("instruction 1");
    });

    it("should work with primitive schemas", () => {
      const stringPrompt: RenderablePrompt = {
        ...testRenderablePrompt,
        responseSchema: z.string(),
      };

      const result = renderPrompt(stringPrompt, "sample code");

      expect(result).toContain('"type": "string"');
    });

    it("should handle array schemas", () => {
      const arraySchema = z.array(
        z.object({
          name: z.string(),
          description: z.string(),
        }),
      );

      const arrayPrompt: RenderablePrompt = {
        ...testRenderablePrompt,
        responseSchema: arraySchema,
      };

      const result = renderPrompt(arrayPrompt, "sample code");

      expect(result).toContain('"type": "array"');
      expect(result).toContain('"description"');
    });
  });

  describe("Template Variables", () => {
    it("should include all template variables in rendered output", () => {
      // Use PARTIAL_ANALYSIS_TEMPLATE to test the partial analysis note
      const promptWithPartialTemplate: RenderablePrompt = {
        ...testRenderablePrompt,
        template: PARTIAL_ANALYSIS_TEMPLATE,
      };

      const result = renderPrompt(promptWithPartialTemplate, "sample code");

      expect(result).toContain("sample code");
      expect(result).toContain("partial analysis");
      expect(result).toContain("instruction 1");
      expect(result).toContain("CODE:");
    });

    it("should render ANALYSIS_PROMPT_TEMPLATE without partial analysis note", () => {
      const result = renderPrompt(testRenderablePrompt, "sample code");

      // Should render without errors
      expect(result).toContain("sample code");
      expect(result).not.toContain("undefined");
      expect(result).not.toContain("partial analysis");
    });
  });

  describe("Code Block Wrapping", () => {
    it("should wrap content in code blocks when wrapInCodeBlock is true", () => {
      const wrappedPrompt: RenderablePrompt = {
        ...testRenderablePrompt,
        wrapInCodeBlock: true,
      };

      const result = renderPrompt(wrappedPrompt, "sample code");

      // The content should be wrapped with ``` markers
      expect(result).toContain("```\nsample code```");
    });

    it("should not wrap content when wrapInCodeBlock is false", () => {
      const result = renderPrompt(testRenderablePrompt, "sample code");

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

      // Create a typed prompt definition
      const reducePrompt: RenderablePrompt = {
        label: "Reduce Insights",
        contentDesc: buildReduceInsightsContentDesc("technologies"),
        instructions: [`a consolidated list of 'technologies'`],
        responseSchema: categorySchema,
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
        outputFormat: LLMOutputFormat.JSON,
      };

      const partialData = {
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
      };

      const result = renderPrompt(reducePrompt, JSON.stringify(partialData));

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

      const reducePrompt: RenderablePrompt = {
        label: "Reduce Insights",
        contentDesc: buildReduceInsightsContentDesc("technologies"),
        instructions: [`a consolidated list of 'technologies'`],
        responseSchema: techSchema,
        template: ANALYSIS_PROMPT_TEMPLATE,
        dataBlockHeader: "FRAGMENTED_DATA",
        wrapInCodeBlock: false,
        outputFormat: LLMOutputFormat.JSON,
      };

      const result = renderPrompt(
        reducePrompt,
        JSON.stringify({ technologies: [{ name: "TypeScript", version: "5.7" }] }),
      );

      expect(result).toContain("'technologies'");
      expect(result).toContain("TypeScript");
    });
  });

  describe("Data Block Header", () => {
    it("should use the correct dataBlockHeader in output", () => {
      const result = renderPrompt(testRenderablePrompt, "sample code");
      expect(result).toContain("CODE:");
    });

    it("should handle different dataBlockHeaders", () => {
      const fileSummariesPrompt: RenderablePrompt = {
        ...testRenderablePrompt,
        dataBlockHeader: "FILE_SUMMARIES",
      };

      const result = renderPrompt(fileSummariesPrompt, "summaries");
      expect(result).toContain("FILE_SUMMARIES:");
    });

    it("should handle FRAGMENTED_DATA header", () => {
      const fragmentedPrompt: RenderablePrompt = {
        ...testRenderablePrompt,
        dataBlockHeader: "FRAGMENTED_DATA",
      };

      const result = renderPrompt(fragmentedPrompt, "data");
      expect(result).toContain("FRAGMENTED_DATA:");
    });
  });
});

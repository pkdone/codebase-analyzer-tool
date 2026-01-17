import { z } from "zod";
import { renderPrompt } from "../../../src/common/prompts/prompt-renderer";
import type { RenderablePrompt } from "../../../src/common/prompts/prompt.types";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";

describe("Prompt Renderer Type Safety", () => {
  /**
   * Base test definition used across tests
   */
  const testDefinition: RenderablePrompt = {
    label: "Test Prompt",
    contentDesc: "test content description",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.object({ result: z.string(), count: z.number() }),
    template: ANALYSIS_PROMPT_TEMPLATE,
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
  };

  describe("Template Variable Rendering", () => {
    it("should render contentDesc from definition", () => {
      const result = renderPrompt(testDefinition, "sample");
      expect(result).toContain("test content description");
    });

    it("should render instructionsText as joined instructions", () => {
      const result = renderPrompt(testDefinition, "sample");
      expect(result).toContain("instruction 1");
      expect(result).toContain("instruction 2");
    });

    it("should render dataBlockHeader from definition", () => {
      const result = renderPrompt(testDefinition, "sample");
      expect(result).toContain("CODE:");
    });

    it("should render content from data", () => {
      const result = renderPrompt(testDefinition, "my sample content");
      expect(result).toContain("my sample content");
    });

    it("should render jsonSchema from responseSchema", () => {
      const result = renderPrompt(testDefinition, "sample");
      // Should contain the schema properties
      expect(result).toContain('"result"');
      expect(result).toContain('"count"');
      expect(result).toContain('"type": "object"');
    });

    it("should render forceJSON enforcement text", () => {
      const result = renderPrompt(testDefinition, "sample");
      expect(result).toContain("The response MUST be valid JSON");
    });
  });

  describe("PARTIAL_ANALYSIS_TEMPLATE Handling", () => {
    it("should render partial analysis note when using PARTIAL_ANALYSIS_TEMPLATE", () => {
      const partialDefinition: RenderablePrompt = {
        ...testDefinition,
        template: PARTIAL_ANALYSIS_TEMPLATE,
      };

      const result = renderPrompt(partialDefinition, "sample");

      expect(result).toContain("partial analysis");
      expect(result).toContain("focus on extracting insights from this subset");
    });

    it("should handle ANALYSIS_PROMPT_TEMPLATE without partial analysis note", () => {
      const result = renderPrompt(testDefinition, "sample");

      // Should not contain "undefined" anywhere in the output
      expect(result).not.toContain("undefined");
      // Should not contain partial analysis note (it's not in ANALYSIS_PROMPT_TEMPLATE)
      expect(result).not.toContain("partial analysis of a larger codebase");
    });
  });

  describe("contentWrapper Behavior", () => {
    it("should not wrap content when wrapInCodeBlock is false", () => {
      const result = renderPrompt(testDefinition, "unwrapped content");

      // Content should appear after "CODE:" without surrounding backticks
      const contentSection = result.split("CODE:")[1];
      expect(contentSection).not.toMatch(/^```\n/);
      expect(contentSection).toContain("unwrapped content");
    });

    it("should wrap content when wrapInCodeBlock is true", () => {
      const wrappedDefinition: RenderablePrompt = {
        ...testDefinition,
        wrapInCodeBlock: true,
      };

      const result = renderPrompt(wrappedDefinition, "wrapped content");
      expect(result).toContain("```\nwrapped content```");
    });
  });

  describe("DataBlockHeader Variants", () => {
    it("should handle CODE dataBlockHeader", () => {
      const result = renderPrompt(testDefinition, "code content");
      expect(result).toContain("CODE:");
    });

    it("should handle FILE_SUMMARIES dataBlockHeader", () => {
      const fileSummariesDef: RenderablePrompt = {
        ...testDefinition,
        dataBlockHeader: "FILE_SUMMARIES",
      };

      const result = renderPrompt(fileSummariesDef, "summaries");
      expect(result).toContain("FILE_SUMMARIES:");
    });

    it("should handle FRAGMENTED_DATA dataBlockHeader", () => {
      const fragmentedDef: RenderablePrompt = {
        ...testDefinition,
        dataBlockHeader: "FRAGMENTED_DATA",
      };

      const result = renderPrompt(fragmentedDef, "fragmented data");
      expect(result).toContain("FRAGMENTED_DATA:");
    });
  });

  describe("Schema Types", () => {
    it("should handle simple object schema", () => {
      const result = renderPrompt(testDefinition, "sample");
      expect(result).toContain('"type": "object"');
    });

    it("should handle array schema", () => {
      const arrayDef: RenderablePrompt = {
        ...testDefinition,
        responseSchema: z.array(z.object({ item: z.string() })),
      };

      const result = renderPrompt(arrayDef, "sample");
      expect(result).toContain('"type": "array"');
    });

    it("should handle string schema", () => {
      const stringDef: RenderablePrompt = {
        ...testDefinition,
        responseSchema: z.string(),
      };

      const result = renderPrompt(stringDef, "sample");
      expect(result).toContain('"type": "string"');
    });

    it("should handle z.unknown() schema", () => {
      const unknownDef: RenderablePrompt = {
        ...testDefinition,
        responseSchema: z.unknown(),
      };

      const result = renderPrompt(unknownDef, "sample");

      // Should still render a valid prompt
      expect(result).toContain("sample");
      expect(result).toContain("instruction 1");
    });

    it("should handle nested schema", () => {
      const nestedDef: RenderablePrompt = {
        ...testDefinition,
        responseSchema: z.object({
          outer: z.object({
            inner: z.array(z.object({ deepField: z.string() })),
          }),
        }),
      };

      const result = renderPrompt(nestedDef, "sample");
      expect(result).toContain('"outer"');
      expect(result).toContain('"inner"');
      expect(result).toContain('"deepField"');
    });
  });

  describe("Instructions Joining", () => {
    it("should join multiple instructions with double newlines", () => {
      const result = renderPrompt(testDefinition, "sample");

      // Instructions should be joined with \n\n
      expect(result).toContain("instruction 1\n\ninstruction 2");
    });

    it("should handle single instruction", () => {
      const singleInstructionDef: RenderablePrompt = {
        ...testDefinition,
        instructions: ["only one instruction"],
      };

      const result = renderPrompt(singleInstructionDef, "sample");
      expect(result).toContain("only one instruction");
    });

    it("should handle empty instructions array", () => {
      const noInstructionsDef: RenderablePrompt = {
        ...testDefinition,
        instructions: [],
      };

      const result = renderPrompt(noInstructionsDef, "sample");
      // Should render without errors
      expect(result).toContain("sample");
    });

    it("should handle instructions with special characters", () => {
      const specialCharDef: RenderablePrompt = {
        ...testDefinition,
        instructions: ["__Title__\n- Point 1\n- Point 2", "Another instruction with `code`"],
      };

      const result = renderPrompt(specialCharDef, "sample");
      expect(result).toContain("__Title__");
      expect(result).toContain("Point 1");
      expect(result).toContain("`code`");
    });
  });

  describe("Content Types", () => {
    it("should handle string content", () => {
      const result = renderPrompt(testDefinition, "string content");
      expect(result).toContain("string content");
    });

    it("should handle JSON string content", () => {
      const jsonContent = JSON.stringify({ key: "value", nested: { data: 123 } });
      const result = renderPrompt(testDefinition, jsonContent);
      expect(result).toContain(jsonContent);
    });

    it("should handle multi-line content", () => {
      const multiLineContent = `line 1
line 2
line 3`;
      const result = renderPrompt(testDefinition, multiLineContent);
      expect(result).toContain("line 1");
      expect(result).toContain("line 2");
      expect(result).toContain("line 3");
    });

    it("should handle content with code blocks", () => {
      const codeContent = "```javascript\nconsole.log('hello');\n```";
      const result = renderPrompt(testDefinition, codeContent);
      expect(result).toContain("console.log");
    });
  });

  describe("Complete Output Structure", () => {
    it("should produce a complete prompt with all sections", () => {
      // Use PARTIAL_ANALYSIS_TEMPLATE to test with partial analysis note
      const partialDefinition: RenderablePrompt = {
        ...testDefinition,
        template: PARTIAL_ANALYSIS_TEMPLATE,
      };

      const result = renderPrompt(partialDefinition, "sample code");

      // Check overall structure
      expect(result).toContain("Act as a senior developer"); // Template intro
      expect(result).toContain("test content description"); // contentDesc
      expect(result).toContain("instruction 1"); // instructions
      expect(result).toContain("partial analysis"); // From PARTIAL_ANALYSIS_TEMPLATE
      expect(result).toContain("JSON schema"); // Schema section
      expect(result).toContain("CODE:"); // dataBlockHeader
      expect(result).toContain("sample code"); // content
    });

    it("should maintain consistent ordering of sections", () => {
      const result = renderPrompt(testDefinition, "sample");

      const contentDescIndex = result.indexOf("test content description");
      const instructionsIndex = result.indexOf("instruction 1");
      const schemaIndex = result.indexOf("JSON schema");
      const dataBlockIndex = result.indexOf("CODE:");
      const contentIndex = result.indexOf("sample");

      // Verify ordering: contentDesc -> instructions -> schema -> dataBlock -> content
      expect(contentDescIndex).toBeLessThan(instructionsIndex);
      expect(schemaIndex).toBeLessThan(dataBlockIndex);
      expect(dataBlockIndex).toBeLessThan(contentIndex);
    });
  });
});

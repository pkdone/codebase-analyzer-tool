import { z } from "zod";
import { Prompt } from "../../../src/common/prompts/prompt";
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";

describe("Prompt Renderer Type Safety", () => {
  /**
   * Base test definition used across tests
   */
  const testConfig = {
    contentDesc: "test content description",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.object({ result: z.string(), count: z.number() }),
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
  } as const;

  const testPrompt = new Prompt(testConfig, ANALYSIS_PROMPT_TEMPLATE);

  describe("Template Variable Rendering", () => {
    it("should render contentDesc from definition", () => {
      const result = testPrompt.renderPrompt("sample");
      expect(result).toContain("test content description");
    });

    it("should render instructionsText as joined instructions", () => {
      const result = testPrompt.renderPrompt("sample");
      expect(result).toContain("instruction 1");
      expect(result).toContain("instruction 2");
    });

    it("should render dataBlockHeader from definition", () => {
      const result = testPrompt.renderPrompt("sample");
      expect(result).toContain("CODE:");
    });

    it("should render content from data", () => {
      const result = testPrompt.renderPrompt("my sample content");
      expect(result).toContain("my sample content");
    });

    it("should render jsonSchema from responseSchema", () => {
      const result = testPrompt.renderPrompt("sample");
      // Should contain the schema properties
      expect(result).toContain('"result"');
      expect(result).toContain('"count"');
      expect(result).toContain('"type": "object"');
    });

    it("should render forceJSON enforcement text", () => {
      const result = testPrompt.renderPrompt("sample");
      expect(result).toContain("The response MUST be valid JSON");
    });
  });

  describe("PARTIAL_ANALYSIS_TEMPLATE Handling", () => {
    it("should render partial analysis note when using PARTIAL_ANALYSIS_TEMPLATE", () => {
      const partialPrompt = new Prompt(testConfig, PARTIAL_ANALYSIS_TEMPLATE);

      const result = partialPrompt.renderPrompt("sample");

      expect(result).toContain("partial analysis");
      expect(result).toContain("focus on extracting insights from this subset");
    });

    it("should handle ANALYSIS_PROMPT_TEMPLATE without partial analysis note", () => {
      const result = testPrompt.renderPrompt("sample");

      // Should not contain "undefined" anywhere in the output
      expect(result).not.toContain("undefined");
      // Should not contain partial analysis note (it's not in ANALYSIS_PROMPT_TEMPLATE)
      expect(result).not.toContain("partial analysis of a larger codebase");
    });
  });

  describe("contentWrapper Behavior", () => {
    it("should not wrap content when wrapInCodeBlock is false", () => {
      const result = testPrompt.renderPrompt("unwrapped content");

      // Content should appear after "CODE:" without surrounding backticks
      const contentSection = result.split("CODE:")[1];
      expect(contentSection).not.toMatch(/^```\n/);
      expect(contentSection).toContain("unwrapped content");
    });

    it("should wrap content when wrapInCodeBlock is true", () => {
      const wrappedPrompt = new Prompt(
        { ...testConfig, wrapInCodeBlock: true },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = wrappedPrompt.renderPrompt("wrapped content");
      expect(result).toContain("```\nwrapped content```");
    });
  });

  describe("DataBlockHeader Variants", () => {
    it("should handle CODE dataBlockHeader", () => {
      const result = testPrompt.renderPrompt("code content");
      expect(result).toContain("CODE:");
    });

    it("should handle FILE_SUMMARIES dataBlockHeader", () => {
      const fileSummariesPrompt = new Prompt(
        { ...testConfig, dataBlockHeader: "FILE_SUMMARIES" },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = fileSummariesPrompt.renderPrompt("summaries");
      expect(result).toContain("FILE_SUMMARIES:");
    });

    it("should handle FRAGMENTED_DATA dataBlockHeader", () => {
      const fragmentedPrompt = new Prompt(
        { ...testConfig, dataBlockHeader: "FRAGMENTED_DATA" },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = fragmentedPrompt.renderPrompt("fragmented data");
      expect(result).toContain("FRAGMENTED_DATA:");
    });
  });

  describe("Schema Types", () => {
    it("should handle simple object schema", () => {
      const result = testPrompt.renderPrompt("sample");
      expect(result).toContain('"type": "object"');
    });

    it("should handle array schema", () => {
      const arrayPrompt = new Prompt(
        { ...testConfig, responseSchema: z.array(z.object({ item: z.string() })) },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = arrayPrompt.renderPrompt("sample");
      expect(result).toContain('"type": "array"');
    });

    it("should handle string schema", () => {
      const stringPrompt = new Prompt(
        { ...testConfig, responseSchema: z.string() },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = stringPrompt.renderPrompt("sample");
      expect(result).toContain('"type": "string"');
    });

    it("should handle z.unknown() schema", () => {
      const unknownPrompt = new Prompt(
        { ...testConfig, responseSchema: z.unknown() },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = unknownPrompt.renderPrompt("sample");

      // Should still render a valid prompt
      expect(result).toContain("sample");
      expect(result).toContain("instruction 1");
    });

    it("should handle nested schema", () => {
      const nestedPrompt = new Prompt(
        {
          ...testConfig,
          responseSchema: z.object({
            outer: z.object({
              inner: z.array(z.object({ deepField: z.string() })),
            }),
          }),
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = nestedPrompt.renderPrompt("sample");
      expect(result).toContain('"outer"');
      expect(result).toContain('"inner"');
      expect(result).toContain('"deepField"');
    });
  });

  describe("Instructions Joining", () => {
    it("should join multiple instructions with double newlines", () => {
      const result = testPrompt.renderPrompt("sample");

      // Instructions should be joined with \n\n
      expect(result).toContain("instruction 1\n\ninstruction 2");
    });

    it("should handle single instruction", () => {
      const singleInstructionPrompt = new Prompt(
        { ...testConfig, instructions: ["only one instruction"] },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = singleInstructionPrompt.renderPrompt("sample");
      expect(result).toContain("only one instruction");
    });

    it("should handle empty instructions array", () => {
      const noInstructionsPrompt = new Prompt(
        { ...testConfig, instructions: [] },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = noInstructionsPrompt.renderPrompt("sample");
      // Should render without errors
      expect(result).toContain("sample");
    });

    it("should handle instructions with special characters", () => {
      const specialCharPrompt = new Prompt(
        {
          ...testConfig,
          instructions: ["__Title__\n- Point 1\n- Point 2", "Another instruction with `code`"],
        },
        ANALYSIS_PROMPT_TEMPLATE,
      );

      const result = specialCharPrompt.renderPrompt("sample");
      expect(result).toContain("__Title__");
      expect(result).toContain("Point 1");
      expect(result).toContain("`code`");
    });
  });

  describe("Content Types", () => {
    it("should handle string content", () => {
      const result = testPrompt.renderPrompt("string content");
      expect(result).toContain("string content");
    });

    it("should handle JSON string content", () => {
      const jsonContent = JSON.stringify({ key: "value", nested: { data: 123 } });
      const result = testPrompt.renderPrompt(jsonContent);
      expect(result).toContain(jsonContent);
    });

    it("should handle multi-line content", () => {
      const multiLineContent = `line 1
line 2
line 3`;
      const result = testPrompt.renderPrompt(multiLineContent);
      expect(result).toContain("line 1");
      expect(result).toContain("line 2");
      expect(result).toContain("line 3");
    });

    it("should handle content with code blocks", () => {
      const codeContent = "```javascript\nconsole.log('hello');\n```";
      const result = testPrompt.renderPrompt(codeContent);
      expect(result).toContain("console.log");
    });
  });

  describe("Complete Output Structure", () => {
    it("should produce a complete prompt with all sections", () => {
      // Use PARTIAL_ANALYSIS_TEMPLATE to test with partial analysis note
      const partialPrompt = new Prompt(testConfig, PARTIAL_ANALYSIS_TEMPLATE);

      const result = partialPrompt.renderPrompt("sample code");

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
      const result = testPrompt.renderPrompt("sample");

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

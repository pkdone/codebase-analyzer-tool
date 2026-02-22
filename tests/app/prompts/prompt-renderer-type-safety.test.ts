import { z } from "zod";
import { renderJsonSchemaPrompt } from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompts.constants";

describe("renderJsonSchemaPrompt Renderer Type Safety", () => {
  /**
   * Base test config used across tests
   */
  const testConfig = {
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    contentDesc: "test content description",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.object({ result: z.string(), count: z.number() }),
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
  } as const;

  describe("Template Variable Rendering", () => {
    it("should render contentDesc from config", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");
      expect(result).toContain("test content description");
    });

    it("should render instructionsText as joined instructions", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");
      expect(result).toContain("instruction 1");
      expect(result).toContain("instruction 2");
    });

    it("should render dataBlockHeader from config", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");
      expect(result).toContain("CODE:");
    });

    it("should render content from data", () => {
      const result = renderJsonSchemaPrompt(testConfig, "my sample content");
      expect(result).toContain("my sample content");
    });

    it("should render jsonSchema from responseSchema", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");
      // Should contain the schema properties
      expect(result).toContain('"result"');
      expect(result).toContain('"count"');
      expect(result).toContain('"type": "object"');
    });

    it("should render forceJSON enforcement text", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");
      expect(result).toContain("The response MUST be valid JSON");
    });
  });

  describe("contextNote Handling", () => {
    it("should render partial analysis note when contextNote is provided", () => {
      const contextNote =
        "Note, this is a partial analysis of what is a much larger set of code; focus on extracting insights from this subset of code only.\n\n";
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          contextNote,
        },
        "sample",
      );

      expect(result).toContain("partial analysis");
      expect(result).toContain("focus on extracting insights from this subset");
    });

    it("should NOT include partial analysis note when contextNote is not set", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");

      // Should not contain "undefined" anywhere in the output
      expect(result).not.toContain("undefined");
      // Should not contain partial analysis note (contextNote is not set)
      expect(result).not.toContain("partial analysis of a larger codebase");
    });
  });

  describe("contentWrapper Behavior", () => {
    it("should not wrap content when wrapInCodeBlock is false", () => {
      const result = renderJsonSchemaPrompt(testConfig, "unwrapped content");

      // Content should appear after "CODE:" without surrounding backticks
      const contentSection = result.split("CODE:")[1];
      expect(contentSection).not.toMatch(/^```\n/);
      expect(contentSection).toContain("unwrapped content");
    });

    it("should wrap content when wrapInCodeBlock is true", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          wrapInCodeBlock: true,
        },
        "wrapped content",
      );
      expect(result).toContain("```\nwrapped content```");
    });
  });

  describe("DataBlockHeader Variants", () => {
    it("should handle CODE dataBlockHeader", () => {
      const result = renderJsonSchemaPrompt(testConfig, "code content");
      expect(result).toContain("CODE:");
    });

    it("should handle FILE_SUMMARIES dataBlockHeader", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          dataBlockHeader: "FILE_SUMMARIES",
        },
        "summaries",
      );
      expect(result).toContain("FILE_SUMMARIES:");
    });

    it("should handle FRAGMENTED_DATA dataBlockHeader", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          dataBlockHeader: "FRAGMENTED_DATA",
        },
        "fragmented data",
      );
      expect(result).toContain("FRAGMENTED_DATA:");
    });
  });

  describe("Schema Types", () => {
    it("should handle simple object schema", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");
      expect(result).toContain('"type": "object"');
    });

    it("should handle array schema", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          responseSchema: z.array(z.object({ item: z.string() })),
        },
        "sample",
      );
      expect(result).toContain('"type": "array"');
    });

    it("should handle string schema", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          responseSchema: z.string(),
        },
        "sample",
      );
      expect(result).toContain('"type": "string"');
    });

    it("should handle z.unknown() schema", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          responseSchema: z.unknown(),
        },
        "sample",
      );

      // Should still render a valid prompt
      expect(result).toContain("sample");
      expect(result).toContain("instruction 1");
    });

    it("should handle nested schema", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          responseSchema: z.object({
            outer: z.object({
              inner: z.array(z.object({ deepField: z.string() })),
            }),
          }),
        },
        "sample",
      );
      expect(result).toContain('"outer"');
      expect(result).toContain('"inner"');
      expect(result).toContain('"deepField"');
    });
  });

  describe("Instructions Joining", () => {
    it("should join multiple instructions with double newlines", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");

      // Instructions should be joined with \n\n
      expect(result).toContain("instruction 1\n\ninstruction 2");
    });

    it("should handle single instruction", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          instructions: ["only one instruction"],
        },
        "sample",
      );
      expect(result).toContain("only one instruction");
    });

    it("should handle empty instructions array", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          instructions: [],
        },
        "sample",
      );
      // Should render without errors
      expect(result).toContain("sample");
    });

    it("should handle instructions with special characters", () => {
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          instructions: ["__Title__\n- Point 1\n- Point 2", "Another instruction with `code`"],
        },
        "sample",
      );
      expect(result).toContain("__Title__");
      expect(result).toContain("Point 1");
      expect(result).toContain("`code`");
    });
  });

  describe("Content Types", () => {
    it("should handle string content", () => {
      const result = renderJsonSchemaPrompt(testConfig, "string content");
      expect(result).toContain("string content");
    });

    it("should handle JSON string content", () => {
      const jsonContent = JSON.stringify({ key: "value", nested: { data: 123 } });
      const result = renderJsonSchemaPrompt(testConfig, jsonContent);
      expect(result).toContain(jsonContent);
    });

    it("should handle multi-line content", () => {
      const multiLineContent = `line 1
line 2
line 3`;
      const result = renderJsonSchemaPrompt(testConfig, multiLineContent);
      expect(result).toContain("line 1");
      expect(result).toContain("line 2");
      expect(result).toContain("line 3");
    });

    it("should handle content with code blocks", () => {
      const codeContent = "```javascript\nconsole.log('hello');\n```";
      const result = renderJsonSchemaPrompt(testConfig, codeContent);
      expect(result).toContain("console.log");
    });
  });

  describe("Complete Output Structure", () => {
    it("should produce a complete prompt with all sections including partial analysis note", () => {
      // Use contextNote to test with partial analysis note
      const contextNote =
        "Note, this is a partial analysis of what is a much larger set of code; focus on extracting insights from this subset of code only.\n\n";
      const result = renderJsonSchemaPrompt(
        {
          ...testConfig,
          contextNote,
        },
        "sample code",
      );

      // Check overall structure
      expect(result).toContain("Act as a senior developer"); // Template intro
      expect(result).toContain("test content description"); // contentDesc
      expect(result).toContain("instruction 1"); // instructions
      expect(result).toContain("partial analysis"); // From contextNote
      expect(result).toContain("JSON schema"); // Schema section
      expect(result).toContain("CODE:"); // dataBlockHeader
      expect(result).toContain("sample code"); // content
    });

    it("should maintain consistent ordering of sections", () => {
      const result = renderJsonSchemaPrompt(testConfig, "sample");

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

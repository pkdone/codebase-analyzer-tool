import {
  renderJsonSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../../src/app/prompts/prompts.constants";
import { z } from "zod";

describe("renderJsonSchemaPrompt", () => {
  const createMockConfig = (overrides?: Partial<JSONSchemaPromptConfig>): JSONSchemaPromptConfig => {
    return {
      personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
      contentDesc: "Test intro text template with {{placeholder}}",
      instructions: ["instruction 1", "instruction 2"],
      responseSchema: z.string(),
      dataBlockHeader: "CODE",
      wrapInCodeBlock: false,
      ...overrides,
    };
  };

  describe("structure", () => {
    it("should render with required config fields", () => {
      const config: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "Test intro text template",
        instructions: ["test"],
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      const rendered = renderJsonSchemaPrompt(config, "test content");

      expect(rendered).toContain("Test intro text template");
      expect(rendered).toContain("test");
    });
  });

  describe("compatibility", () => {
    it("should accept readonly string arrays for instructions", () => {
      const config: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "Test intro text template",
        instructions: ["a", "b", "c"],
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      const rendered = renderJsonSchemaPrompt(config, "test content");

      expect(rendered).toContain("a");
      expect(rendered).toContain("b");
      expect(rendered).toContain("c");
    });

    it("should accept various Zod schema types", () => {
      const stringResult = renderJsonSchemaPrompt(
        createMockConfig({ responseSchema: z.string() }),
        "test",
      );
      expect(stringResult).toBeDefined();

      const objectResult = renderJsonSchemaPrompt(
        createMockConfig({ responseSchema: z.object({ name: z.string() }) }),
        "test",
      );
      expect(objectResult).toBeDefined();

      const arrayResult = renderJsonSchemaPrompt(
        createMockConfig({ responseSchema: z.array(z.string()) }),
        "test",
      );
      expect(arrayResult).toBeDefined();
    });
  });

  describe("usage examples", () => {
    it("should work with source file prompting", () => {
      const config: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc:
          "Act as a senior developer analyzing the code in an existing application. Based on the JVM code shown below...",
        instructions: [
          "Extract the class name",
          "Extract the purpose",
          "Extract the implementation",
        ],
        responseSchema: z.object({
          name: z.string(),
          purpose: z.string(),
          implementation: z.string(),
        }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(config.contentDesc).toContain("JVM code");
      expect(config.instructions).toHaveLength(3);
    });

    it("should work with app summary prompting", () => {
      const config: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc:
          "Act as a senior developer analyzing the code in an existing application. Based on the source files shown below...",
        instructions: ["Extract entities", "Extract bounded contexts"],
        responseSchema: z.object({
          entities: z.array(z.string()),
          boundedContexts: z.array(z.string()),
        }),
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      };

      expect(config.contentDesc).toContain("source files");
      expect(config.instructions).toHaveLength(2);
      expect(config.instructions[0]).toBe("Extract entities");
      expect(config.instructions[1]).toBe("Extract bounded contexts");
    });
  });

  describe("immutability", () => {
    it("should support readonly string arrays", () => {
      const readonlyInstructions: readonly string[] = ["instruction 1", "instruction 2"];

      const config: JSONSchemaPromptConfig = {
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "Test intro text template",
        instructions: readonlyInstructions,
        responseSchema: z.string(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      expect(config.instructions).toEqual(["instruction 1", "instruction 2"]);
    });
  });
});

import { PromptDefinition } from "../../../../src/app/prompts/prompt.types";
import { z } from "zod";

describe("PromptDefinition", () => {
  const createMockPromptDefinition = (overrides?: Partial<PromptDefinition>): PromptDefinition => ({
    introTextTemplate: "Test intro text template with {{placeholder}}",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    hasComplexSchema: false,
    template: "Test template",
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
    ...overrides,
  });

  describe("structure", () => {
    it("should have required fields", () => {
      const definition: PromptDefinition = {
        introTextTemplate: "Test intro text template",
        instructions: ["test"],
        responseSchema: z.string(),
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      expect(definition.introTextTemplate).toBe("Test intro text template");
      expect(definition.instructions).toEqual(["test"]);
      expect(definition.responseSchema).toBeDefined();
    });

    it("should have optional hasComplexSchema field", () => {
      const definitionWithoutFlag = createMockPromptDefinition({
        hasComplexSchema: undefined,
      });
      expect(definitionWithoutFlag.hasComplexSchema).toBeUndefined();

      const definitionWithFlag = createMockPromptDefinition({
        hasComplexSchema: true,
      });
      expect(definitionWithFlag.hasComplexSchema).toBe(true);
    });
  });

  describe("compatibility", () => {
    it("should accept readonly string arrays for instructions", () => {
      const definition: PromptDefinition = {
        introTextTemplate: "Test intro text template",
        instructions: ["a", "b", "c"],
        responseSchema: z.string(),
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      expect(Array.isArray(definition.instructions)).toBe(true);
      expect(definition.instructions.length).toBe(3);
    });

    it("should accept various Zod schema types", () => {
      const stringSchema = createMockPromptDefinition({ responseSchema: z.string() });
      expect(stringSchema.responseSchema).toBeDefined();

      const objectSchema = createMockPromptDefinition({
        responseSchema: z.object({ name: z.string() }),
      });
      expect(objectSchema.responseSchema).toBeDefined();

      const arraySchema = createMockPromptDefinition({ responseSchema: z.array(z.string()) });
      expect(arraySchema.responseSchema).toBeDefined();
    });
  });

  describe("usage examples", () => {
    it("should work with source file prompting", () => {
      const sourceFileDefinition: PromptDefinition = {
        introTextTemplate:
          "Act as a senior developer analyzing the code in a legacy application. Based on the JVM code shown below...",
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
        hasComplexSchema: true,
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(sourceFileDefinition.introTextTemplate).toContain("JVM code");
      expect(sourceFileDefinition.instructions).toHaveLength(3);
      expect(sourceFileDefinition.hasComplexSchema).toBe(true);
    });

    it("should work with app summary prompting", () => {
      const appSummaryDefinition: PromptDefinition = {
        introTextTemplate:
          "Act as a senior developer analyzing the code in a legacy application. Based on the source files shown below...",
        instructions: ["Extract entities", "Extract bounded contexts"],
        responseSchema: z.object({
          entities: z.array(z.string()),
          boundedContexts: z.array(z.string()),
        }),
        hasComplexSchema: false,
        template: "Test template",
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      };

      expect(appSummaryDefinition.introTextTemplate).toContain("source files");
      expect(appSummaryDefinition.instructions).toHaveLength(2);
      expect(appSummaryDefinition.instructions[0]).toBe("Extract entities");
      expect(appSummaryDefinition.instructions[1]).toBe("Extract bounded contexts");
      expect(appSummaryDefinition.hasComplexSchema).toBe(false);
    });
  });

  describe("immutability", () => {
    it("should support readonly string arrays", () => {
      const readonlyInstructions: readonly string[] = ["instruction 1", "instruction 2"];

      const definition: PromptDefinition = {
        introTextTemplate: "Test intro text template",
        instructions: readonlyInstructions,
        responseSchema: z.string(),
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      expect(definition.instructions).toEqual(["instruction 1", "instruction 2"]);
    });
  });
});

import { PromptDefinition } from "../../../../src/app/prompts/prompt.types";
import { z } from "zod";

describe("PromptDefinition", () => {
  const createMockPromptDefinition = (overrides?: Partial<PromptDefinition>): PromptDefinition => ({
    contentDesc: "Test intro text template with {{placeholder}}",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    template: "Test template",
    dataBlockHeader: "CODE",
    wrapInCodeBlock: false,
    ...overrides,
  });

  describe("structure", () => {
    it("should have required fields", () => {
      const definition: PromptDefinition = {
        contentDesc: "Test intro text template",
        instructions: ["test"],
        responseSchema: z.string(),
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      };

      expect(definition.contentDesc).toBe("Test intro text template");
      expect(definition.instructions).toEqual(["test"]);
      expect(definition.responseSchema).toBeDefined();
    });

    it("should have optional label field", () => {
      const definitionWithoutLabel = createMockPromptDefinition();
      expect(definitionWithoutLabel.label).toBeUndefined();

      const definitionWithLabel = createMockPromptDefinition({
        label: "Test Label",
      });
      expect(definitionWithLabel.label).toBe("Test Label");
    });
  });

  describe("compatibility", () => {
    it("should accept readonly string arrays for instructions", () => {
      const definition: PromptDefinition = {
        contentDesc: "Test intro text template",
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
        template: "Test template",
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(sourceFileDefinition.contentDesc).toContain("JVM code");
      expect(sourceFileDefinition.instructions).toHaveLength(3);
    });

    it("should work with app summary prompting", () => {
      const appSummaryDefinition: PromptDefinition = {
        contentDesc:
          "Act as a senior developer analyzing the code in an existing application. Based on the source files shown below...",
        instructions: ["Extract entities", "Extract bounded contexts"],
        responseSchema: z.object({
          entities: z.array(z.string()),
          boundedContexts: z.array(z.string()),
        }),
        template: "Test template",
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      };

      expect(appSummaryDefinition.contentDesc).toContain("source files");
      expect(appSummaryDefinition.instructions).toHaveLength(2);
      expect(appSummaryDefinition.instructions[0]).toBe("Extract entities");
      expect(appSummaryDefinition.instructions[1]).toBe("Extract bounded contexts");
    });
  });

  describe("immutability", () => {
    it("should support readonly string arrays", () => {
      const readonlyInstructions: readonly string[] = ["instruction 1", "instruction 2"];

      const definition: PromptDefinition = {
        contentDesc: "Test intro text template",
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

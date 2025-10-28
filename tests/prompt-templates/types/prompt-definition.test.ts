import { PromptDefinition } from "../../../src/prompt-templates/types/prompt-definition.types";
import { z } from "zod";

describe("PromptDefinition", () => {
  const createMockPromptDefinition = (overrides?: Partial<PromptDefinition>): PromptDefinition => ({
    contentDesc: "test content",
    instructions: ["instruction 1", "instruction 2"],
    responseSchema: z.string(),
    hasComplexSchema: false,
    ...overrides,
  });

  describe("structure", () => {
    it("should have required fields", () => {
      const definition: PromptDefinition = {
        contentDesc: "test",
        instructions: ["test"],
        responseSchema: z.string(),
      };

      expect(definition.contentDesc).toBe("test");
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
        contentDesc: "test",
        instructions: ["a", "b", "c"] as readonly string[],
        responseSchema: z.string(),
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
        contentDesc: "JVM code",
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
      };

      expect(sourceFileDefinition.contentDesc).toBe("JVM code");
      expect(sourceFileDefinition.instructions).toHaveLength(3);
      expect(sourceFileDefinition.hasComplexSchema).toBe(true);
    });

    it("should work with app summary prompting", () => {
      const appSummaryDefinition: PromptDefinition = {
        contentDesc: "source files",
        instructions: ["Extract entities", "Extract bounded contexts"],
        responseSchema: z.object({
          entities: z.array(z.string()),
          boundedContexts: z.array(z.string()),
        }),
        hasComplexSchema: false,
      };

      expect(appSummaryDefinition.contentDesc).toBe("source files");
      expect(appSummaryDefinition.instructions).toHaveLength(2);
      expect(appSummaryDefinition.hasComplexSchema).toBe(false);
    });
  });

  describe("immutability", () => {
    it("should support readonly instructions arrays", () => {
      const readonlyInstructions: readonly string[] = ["instruction 1", "instruction 2"];

      const definition: PromptDefinition = {
        contentDesc: "test",
        instructions: readonlyInstructions,
        responseSchema: z.string(),
      };

      expect(definition.instructions).toEqual(["instruction 1", "instruction 2"]);
    });
  });
});

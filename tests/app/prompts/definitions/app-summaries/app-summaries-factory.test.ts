import { z } from "zod";
import {
  createAppSummaryConfig,
  type AppSummaryConfigEntry,
} from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.factories";
import { appSummaryConfigMap } from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.definitions";
import { FILE_SUMMARIES_DATA_BLOCK_HEADER } from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.factories";

/**
 * Unit tests for the createAppSummaryConfig factory function.
 * Verifies that the factory correctly creates AppSummaryConfigEntry objects
 * with proper default values and type safety.
 *
 * The factory uses rest parameters for cleaner call sites:
 * createAppSummaryConfig(label, schema, ...instructions)
 */
describe("createAppSummaryConfig Factory", () => {
  const testSchema = z.object({
    testField: z.string(),
  });

  describe("default contentDesc behavior", () => {
    it("should use default contentDesc", () => {
      const config = createAppSummaryConfig(testSchema, "instruction 1");

      expect(config.contentDesc).toBe("a set of source file summaries");
    });

    it("should always use the default contentDesc for all configurations", () => {
      // The factory now uses a fixed contentDesc, which is the standard for all app summaries
      const config = createAppSummaryConfig(testSchema, "test instruction");
      expect(config.contentDesc).toBe("a set of source file summaries");
    });
  });

  describe("field population", () => {
    it("should correctly populate all fields", () => {
      const schema = z.object({ result: z.array(z.string()) });

      const config = createAppSummaryConfig(schema, "do this", "do that");

      expect(config.instructions).toEqual(["do this", "do that"]);
      expect(config.responseSchema).toBe(schema);
      expect(config.contentDesc).toBe("a set of source file summaries");
    });

    it("should collect rest parameters into instructions array", () => {
      const config = createAppSummaryConfig(
        testSchema,
        "instruction 1",
        "instruction 2",
        "instruction 3",
      );

      expect(config.instructions).toEqual(["instruction 1", "instruction 2", "instruction 3"]);
      expect(Array.isArray(config.instructions)).toBe(true);
    });
  });

  describe("type safety", () => {
    it("should return type-safe AppSummaryConfigEntry", () => {
      const specificSchema = z.object({
        specificField: z.number(),
      });

      // Type assertion: The factory should return AppSummaryConfigEntry<typeof specificSchema>
      const config: AppSummaryConfigEntry<typeof specificSchema> = createAppSummaryConfig(
        specificSchema,
        "typed instruction",
      );

      expect(config.responseSchema).toBe(specificSchema);
      // Verify schema works by parsing
      const parseResult = config.responseSchema.safeParse({ specificField: 42 });
      expect(parseResult.success).toBe(true);
    });

    it("should preserve generic schema type through the factory", () => {
      const schema = z.object({
        items: z.array(z.object({ name: z.string() })),
      });

      const config = createAppSummaryConfig(schema, "test");

      // Verify schema type is preserved by parsing valid data
      const validData = { items: [{ name: "test" }] };
      const result = config.responseSchema.safeParse(validData);
      expect(result.success).toBe(true);

      // Verify schema rejects invalid data
      const invalidData = { items: [{ name: 123 }] };
      const invalidResult = config.responseSchema.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe("integration with appSummaryConfigMap", () => {
    it("should produce configs compatible with existing map structure", () => {
      // Verify that factory-created configs have the same structure as map entries
      const factoryConfig = createAppSummaryConfig(
        z.object({ test: z.string() }),
        "test instruction",
      );

      // All configs in the map should have these required fields
      const requiredFields = ["contentDesc", "instructions", "responseSchema"];

      requiredFields.forEach((field) => {
        expect(factoryConfig).toHaveProperty(field);
      });
    });

    it("should verify all appSummaryConfigMap entries have consistent contentDesc", () => {
      const categories = Object.keys(appSummaryConfigMap) as (keyof typeof appSummaryConfigMap)[];

      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];
        expect(config.contentDesc).toBe("a set of source file summaries");
      });
    });

    it("should verify appSummaryConfigMap entries are valid AppSummaryConfigEntry objects", () => {
      const categories = Object.keys(appSummaryConfigMap) as (keyof typeof appSummaryConfigMap)[];

      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];

        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.responseSchema).toBeInstanceOf(z.ZodType);
        expect(typeof config.contentDesc).toBe("string");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle no instructions (empty rest params)", () => {
      const config = createAppSummaryConfig(testSchema);

      expect(config.instructions).toEqual([]);
    });

    it("should handle single instruction", () => {
      const config = createAppSummaryConfig(testSchema, "only one");

      expect(config.instructions).toEqual(["only one"]);
    });

    it("should handle instructions with special characters", () => {
      const config = createAppSummaryConfig(
        testSchema,
        "instruction with `code`",
        'instruction with "quotes"',
        "instruction with\nnewline",
      );

      expect(config.instructions).toEqual([
        "instruction with `code`",
        'instruction with "quotes"',
        "instruction with\nnewline",
      ]);
    });

    it("should handle multi-line instruction strings", () => {
      const multiLineInstruction = `Line 1
Line 2
Line 3`;
      const config = createAppSummaryConfig(testSchema, multiLineInstruction);

      expect(config.instructions).toEqual([multiLineInstruction]);
      expect(config.instructions[0]).toContain("Line 1");
      expect(config.instructions[0]).toContain("Line 2");
    });
  });

  describe("explicit presentation values", () => {
    it("should explicitly set dataBlockHeader to FILE_SUMMARIES", () => {
      const config = createAppSummaryConfig(testSchema, "instruction");

      expect(config.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
    });

    it("should explicitly set wrapInCodeBlock to false", () => {
      const config = createAppSummaryConfig(testSchema, "instruction");

      expect(config.wrapInCodeBlock).toBe(false);
    });

    it("should set consistent presentation values for all appSummaryConfigMap entries", () => {
      const categories = Object.keys(appSummaryConfigMap) as (keyof typeof appSummaryConfigMap)[];

      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];
        expect(config.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
        expect(config.wrapInCodeBlock).toBe(false);
      });
    });
  });

  describe("rest parameter ergonomics", () => {
    it("should allow cleaner call sites without array brackets", () => {
      // New style: createAppSummaryConfig(schema, "instruction")
      const config = createAppSummaryConfig(testSchema, "single instruction");

      expect(config.instructions).toEqual(["single instruction"]);
    });

    it("should support multiple instructions without array syntax", () => {
      const config = createAppSummaryConfig(
        testSchema,
        "first instruction",
        "second instruction",
        "third instruction",
      );

      expect(config.instructions).toHaveLength(3);
      expect(config.instructions[0]).toBe("first instruction");
      expect(config.instructions[1]).toBe("second instruction");
      expect(config.instructions[2]).toBe("third instruction");
    });
  });
});

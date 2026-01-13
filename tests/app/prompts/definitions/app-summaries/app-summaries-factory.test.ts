import { z } from "zod";
import {
  createAppSummaryConfig,
  appSummaryConfigMap,
} from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.definitions";
import {
  DATA_BLOCK_HEADERS,
  type AppSummaryConfigEntry,
} from "../../../../../src/app/prompts/prompt.types";

/**
 * Unit tests for the createAppSummaryConfig factory function.
 * Verifies that the factory correctly creates AppSummaryConfigEntry objects
 * with proper default values and type safety.
 */
describe("createAppSummaryConfig Factory", () => {
  const testSchema = z.object({
    testField: z.string(),
  });

  describe("default contentDesc behavior", () => {
    it("should use default contentDesc when not provided", () => {
      const config = createAppSummaryConfig(
        "Test Label",
        ["instruction 1", "instruction 2"],
        testSchema,
      );

      expect(config.contentDesc).toBe("a set of source file summaries");
    });

    it("should allow custom contentDesc to override default", () => {
      const customContentDesc = "custom content description";
      const config = createAppSummaryConfig(
        "Test Label",
        ["instruction 1"],
        testSchema,
        customContentDesc,
      );

      expect(config.contentDesc).toBe(customContentDesc);
    });
  });

  describe("field population", () => {
    it("should correctly populate all fields", () => {
      const label = "My Category";
      const instructions = ["do this", "do that"] as const;
      const schema = z.object({ result: z.array(z.string()) });

      const config = createAppSummaryConfig(label, instructions, schema);

      expect(config.label).toBe(label);
      expect(config.instructions).toBe(instructions);
      expect(config.responseSchema).toBe(schema);
      expect(config.contentDesc).toBe("a set of source file summaries");
    });

    it("should preserve readonly array type for instructions", () => {
      const instructions = ["instruction 1", "instruction 2"] as const;
      const config = createAppSummaryConfig("Label", instructions, testSchema);

      expect(config.instructions).toBe(instructions);
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
        "Typed Label",
        ["typed instruction"],
        specificSchema,
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

      const config = createAppSummaryConfig("Generic Test", ["test"], schema);

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
        "Test",
        ["test instruction"],
        z.object({ test: z.string() }),
      );

      // All configs in the map should have these required fields
      const requiredFields = ["label", "contentDesc", "instructions", "responseSchema"];

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

        expect(typeof config.label).toBe("string");
        expect(config.label.length).toBeGreaterThan(0);
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.responseSchema).toBeInstanceOf(z.ZodType);
        expect(typeof config.contentDesc).toBe("string");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle empty instructions array", () => {
      const config = createAppSummaryConfig("Empty Instructions", [], testSchema);

      expect(config.instructions).toEqual([]);
      expect(config.label).toBe("Empty Instructions");
    });

    it("should handle single instruction", () => {
      const config = createAppSummaryConfig("Single", ["only one"], testSchema);

      expect(config.instructions).toEqual(["only one"]);
    });

    it("should handle instructions with special characters", () => {
      const instructions = [
        "instruction with `code`",
        'instruction with "quotes"',
        "instruction with\nnewline",
      ];
      const config = createAppSummaryConfig("Special", instructions, testSchema);

      expect(config.instructions).toEqual(instructions);
    });

    it("should handle empty string contentDesc", () => {
      const config = createAppSummaryConfig("Empty Content", ["test"], testSchema, "");

      expect(config.contentDesc).toBe("");
    });
  });

  describe("explicit presentation values", () => {
    it("should explicitly set dataBlockHeader to FILE_SUMMARIES", () => {
      const config = createAppSummaryConfig("Test Label", ["instruction"], testSchema);

      expect(config.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
    });

    it("should explicitly set wrapInCodeBlock to false", () => {
      const config = createAppSummaryConfig("Test Label", ["instruction"], testSchema);

      expect(config.wrapInCodeBlock).toBe(false);
    });

    it("should set consistent presentation values for all appSummaryConfigMap entries", () => {
      const categories = Object.keys(appSummaryConfigMap) as (keyof typeof appSummaryConfigMap)[];

      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];
        expect(config.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
        expect(config.wrapInCodeBlock).toBe(false);
      });
    });
  });
});

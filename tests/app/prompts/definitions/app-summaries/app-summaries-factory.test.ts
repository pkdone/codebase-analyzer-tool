import { z } from "zod";
import { FILE_SUMMARIES_DATA_BLOCK_HEADER } from "../../../../../src/app/prompts/prompts.constants";
import { APP_SUMMARY_CONTENT_DESC } from "../../../../../src/app/prompts/app-summaries/app-summaries.constants";
import {
  appSummaryConfigMap,
  type AppSummaryConfigEntry,
} from "../../../../../src/app/prompts/app-summaries/app-summaries.definitions";

/**
 * Unit tests for the app summary configuration structure.
 * Verifies that AppSummaryConfigEntry objects have proper structure and type safety.
 *
 * Each AppSummaryConfigEntry is self-describing with contentDesc and dataBlockHeader
 * included directly in the configuration, consistent with SourceConfigEntry.
 */
describe("App Summary Configuration", () => {
  describe("constant exports", () => {
    it("should export APP_SUMMARY_CONTENT_DESC constant", () => {
      expect(APP_SUMMARY_CONTENT_DESC).toBe("a set of source file summaries");
    });

    it("should export FILE_SUMMARIES_DATA_BLOCK_HEADER constant", () => {
      expect(FILE_SUMMARIES_DATA_BLOCK_HEADER).toBe("FILE_SUMMARIES");
    });
  });

  describe("appSummaryConfigMap structure", () => {
    it("should have all required categories", () => {
      const expectedCategories = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "potentialMicroservices",
        "inferredArchitecture",
      ];

      expectedCategories.forEach((category) => {
        expect(appSummaryConfigMap).toHaveProperty(category);
      });
    });

    it("should have valid AppSummaryConfigEntry structure for all entries", () => {
      const categories = Object.keys(appSummaryConfigMap) as (keyof typeof appSummaryConfigMap)[];

      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];

        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.responseSchema).toBeInstanceOf(z.ZodType);
      });
    });

    it("should contain contentDesc and dataBlockHeader in each entry", () => {
      const categories = Object.keys(appSummaryConfigMap) as (keyof typeof appSummaryConfigMap)[];

      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];

        expect(config.contentDesc).toBe(APP_SUMMARY_CONTENT_DESC);
        expect(config.dataBlockHeader).toBe(FILE_SUMMARIES_DATA_BLOCK_HEADER);
      });
    });

    it("should have non-empty instruction strings", () => {
      const categories = Object.keys(appSummaryConfigMap) as (keyof typeof appSummaryConfigMap)[];

      categories.forEach((category) => {
        const config = appSummaryConfigMap[category];

        config.instructions.forEach((instruction) => {
          expect(typeof instruction).toBe("string");
          expect(instruction.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe("type safety", () => {
    it("should allow creating type-safe AppSummaryConfigEntry objects", () => {
      const specificSchema = z.object({
        specificField: z.number(),
      });

      // Type should work with specific schema types
      const config: AppSummaryConfigEntry<typeof specificSchema> = {
        contentDesc: "test content",
        dataBlockHeader: "TEST_BLOCK",
        responseSchema: specificSchema,
        instructions: ["typed instruction"],
      };

      expect(config.responseSchema).toBe(specificSchema);
      // Verify schema works by parsing
      const parseResult = config.responseSchema.safeParse({ specificField: 42 });
      expect(parseResult.success).toBe(true);
    });

    it("should allow AppSummaryConfigEntry with default generic type", () => {
      // Should accept any ZodType without specific parameter
      const genericEntry: AppSummaryConfigEntry = {
        contentDesc: "generic content",
        dataBlockHeader: "GENERIC_BLOCK",
        responseSchema: z.string(),
        instructions: [],
      };

      expect(genericEntry.responseSchema).toBeInstanceOf(z.ZodType);
    });

    it("should preserve schema type for validation", () => {
      const schema = z.object({
        items: z.array(z.object({ name: z.string() })),
      });

      const config: AppSummaryConfigEntry<typeof schema> = {
        contentDesc: "items content",
        dataBlockHeader: "ITEMS_BLOCK",
        responseSchema: schema,
        instructions: ["test"],
      };

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

  describe("specific category content", () => {
    it("should have appDescription with correct schema", () => {
      const config = appSummaryConfigMap.appDescription;
      const shape = (config.responseSchema as z.ZodObject<z.ZodRawShape>).shape;
      expect(shape).toHaveProperty("appDescription");
    });

    it("should have technologies with correct schema", () => {
      const config = appSummaryConfigMap.technologies;
      const shape = (config.responseSchema as z.ZodObject<z.ZodRawShape>).shape;
      expect(shape).toHaveProperty("technologies");
    });

    it("should have boundedContexts with hierarchical domain model instructions", () => {
      const config = appSummaryConfigMap.boundedContexts;
      const instructionsText = config.instructions.join(" ");
      expect(instructionsText.toLowerCase()).toContain("repository");
      expect(instructionsText.toLowerCase()).toContain("aggregate");
    });

    it("should have inferredArchitecture with business component guidance", () => {
      const config = appSummaryConfigMap.inferredArchitecture;
      const instructionsText = config.instructions.join(" ");
      expect(instructionsText).toContain("BUSINESS CAPABILITY");
      expect(instructionsText).toContain("INCORRECT examples");
    });
  });
});

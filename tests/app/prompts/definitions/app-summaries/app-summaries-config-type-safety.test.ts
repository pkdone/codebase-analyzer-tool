import { z } from "zod";
import {
  appSummaryConfigMap,
  type AppSummaryConfigMap,
} from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.definitions";
import { type AppSummaryConfigEntry } from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.factories";
import { FILE_SUMMARIES_DATA_BLOCK_HEADER } from "../../../../../src/app/prompts/definitions/app-summaries/app-summaries.factories";
import { AppSummaryCategories } from "../../../../../src/app/schemas/app-summaries.schema";

/**
 * Type safety tests for appSummaryConfigMap.
 * These tests verify that the generic interface and satisfies pattern
 * correctly preserve specific Zod schema types through the type system.
 */
describe("appSummaryConfigMap Type Safety", () => {
  // Get all valid categories from the Zod enum
  const validCategories = AppSummaryCategories.options;

  describe("satisfies Pattern Validation", () => {
    it("should validate that appSummaryConfigMap satisfies Record structure", () => {
      // This is a compile-time check - if it compiles, the satisfies pattern works
      // Runtime verification that all expected keys exist
      for (const category of validCategories) {
        expect(appSummaryConfigMap[category]).toBeDefined();
      }
    });

    it("should have each entry satisfy AppSummaryConfigEntry interface", () => {
      for (const category of validCategories) {
        const entry = appSummaryConfigMap[category];

        // Verify required fields from AppSummaryConfigEntry
        expect(typeof entry.label).toBe("string");
        expect(entry.responseSchema).toBeInstanceOf(z.ZodType);
        expect(Array.isArray(entry.instructions)).toBe(true);
      }
    });
  });

  describe("Generic Interface Type Preservation", () => {
    it("should preserve specific schema types in type alias", () => {
      // AppSummaryConfigMap should be typeof appSummaryConfigMap, preserving literal types
      // This is primarily a compile-time verification
      // Use the types to demonstrate they exist and are distinct
      const appDescConfig: AppSummaryConfigMap["appDescription"] =
        appSummaryConfigMap.appDescription;
      const techConfig: AppSummaryConfigMap["technologies"] = appSummaryConfigMap.technologies;
      const boundedContextsConfig: AppSummaryConfigMap["boundedContexts"] =
        appSummaryConfigMap.boundedContexts;

      // These types should be distinct at compile time
      // At runtime, we verify the schemas are distinct objects
      const appDescSchema = appDescConfig.responseSchema;
      const techSchema = techConfig.responseSchema;
      const boundedContextsSchema = boundedContextsConfig.responseSchema;

      expect(appDescSchema).not.toBe(techSchema);
      expect(techSchema).not.toBe(boundedContextsSchema);
      expect(appDescSchema).not.toBe(boundedContextsSchema);
    });

    it("should allow specific schema types to be extracted via inference", () => {
      // Type-level test: Extract the inferred type from a specific entry's schema
      type AppDescInferred = z.infer<
        (typeof appSummaryConfigMap)["appDescription"]["responseSchema"]
      >;
      type TechInferred = z.infer<(typeof appSummaryConfigMap)["technologies"]["responseSchema"]>;

      // Runtime test: Parse sample data against specific schemas
      const appDescSample: AppDescInferred = {
        appDescription: "This is a test application description.",
      };

      const techSample: TechInferred = {
        technologies: [
          { name: "TypeScript", description: "Primary language" },
          { name: "Node.js", description: "Runtime environment" },
        ],
      };

      const appDescResult =
        appSummaryConfigMap.appDescription.responseSchema.safeParse(appDescSample);
      const techResult = appSummaryConfigMap.technologies.responseSchema.safeParse(techSample);

      expect(appDescResult.success).toBe(true);
      expect(techResult.success).toBe(true);
    });
  });

  describe("AppSummaryConfigEntry Generic Interface", () => {
    it("should accept generic type parameter for specific schemas", () => {
      // Create a test entry with a specific schema type
      const testSchema = z.object({
        testCategory: z.array(z.string()),
      });

      // This should compile without error, showing the generic works
      const testEntry: AppSummaryConfigEntry<typeof testSchema> = {
        label: "Test Category",
        contentDesc: "test content",
        responseSchema: testSchema,
        instructions: ["Generate a test list"],
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      };

      expect(testEntry.responseSchema).toBe(testSchema);
      expect(testEntry.label).toBe("Test Category");
    });

    it("should default to z.ZodType when no type parameter is provided", () => {
      // This should accept any ZodType without specific parameter
      const genericEntry: AppSummaryConfigEntry = {
        label: "Generic Label",
        contentDesc: "test content",
        responseSchema: z.string(),
        instructions: [],
        dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
        wrapInCodeBlock: false,
      };

      expect(genericEntry.responseSchema).toBeInstanceOf(z.ZodType);
    });
  });

  describe("as const Immutability", () => {
    it("should preserve readonly arrays for instructions", () => {
      for (const category of validCategories) {
        const entry = appSummaryConfigMap[category];
        // Instructions should be an array (readonly at type level)
        expect(Array.isArray(entry.instructions)).toBe(true);
      }
    });

    it("should have immutable structure at the config map level", () => {
      // The entire config map should be frozen/immutable in terms of structure
      // This tests that as const is applied correctly
      const keys = Object.keys(appSummaryConfigMap);
      expect(keys.length).toBe(validCategories.length);
    });
  });

  describe("Schema Type Distinctness", () => {
    it("should have different schemas for different categories", () => {
      // Get shapes from different categories
      const appDescShape = Object.keys(
        (appSummaryConfigMap.appDescription.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      );
      const techShape = Object.keys(
        (appSummaryConfigMap.technologies.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      );
      const boundedContextsShape = Object.keys(
        (appSummaryConfigMap.boundedContexts.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      );

      // Each category should have its own distinct key
      expect(appDescShape).toContain("appDescription");
      expect(techShape).toContain("technologies");
      expect(boundedContextsShape).toContain("boundedContexts");

      // They should not contain each other's keys
      expect(appDescShape).not.toContain("technologies");
      expect(techShape).not.toContain("appDescription");
    });

    it("should validate that each category schema is a ZodObject", () => {
      for (const category of validCategories) {
        const schema = appSummaryConfigMap[category].responseSchema;
        // All schemas should be ZodObject instances
        expect(schema).toBeInstanceOf(z.ZodObject);
      }
    });
  });

  describe("Category Labels", () => {
    it("should have unique labels for each category", () => {
      const labels = Object.values(appSummaryConfigMap).map((entry) => entry.label);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });

    it("should have non-empty labels", () => {
      for (const category of validCategories) {
        const entry = appSummaryConfigMap[category];
        expect(entry.label.length).toBeGreaterThan(0);
      }
    });
  });
});

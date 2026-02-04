import {
  appSummaryConfigMap,
  type AppSummaryConfigMap,
} from "../../../../../src/app/prompts/app-summaries/app-summaries.definitions";
import {
  AppSummaryCategories,
  type AppSummaryCategoryEnum,
} from "../../../../../src/app/schemas/app-summaries.schema";

/**
 * Tests for appSummaryConfigMap completeness validation.
 *
 * These tests verify that the strengthened type constraint using AppSummaryCategoryEnum
 * as the Record key type correctly enforces completeness at both compile-time and runtime.
 */
describe("appSummaryConfigMap Completeness Validation", () => {
  // Get all valid categories from the Zod enum
  const validCategories = AppSummaryCategories.options;

  describe("Enum-Keyed Record Completeness", () => {
    it("should have an entry for every AppSummaryCategoryEnum value", () => {
      // This test verifies that the satisfies Record<AppSummaryCategoryEnum, ...> constraint
      // ensures all categories are present. If a category is missing, TypeScript would
      // report a compile-time error on the appSummaryConfigMap definition.

      // Runtime verification that all expected keys exist
      for (const category of validCategories) {
        expect(appSummaryConfigMap[category]).toBeDefined();
        expect(appSummaryConfigMap[category].responseSchema).toBeDefined();
        expect(appSummaryConfigMap[category].instructions).toBeDefined();
      }
    });

    it("should have exactly the same number of entries as AppSummaryCategoryEnum values", () => {
      const configMapKeys = Object.keys(appSummaryConfigMap);
      expect(configMapKeys.length).toBe(validCategories.length);
    });

    it("should have all config map keys be valid AppSummaryCategoryEnum values", () => {
      const configMapKeys = Object.keys(appSummaryConfigMap);

      for (const key of configMapKeys) {
        // Use the Zod enum to validate each key is a valid category
        const parseResult = AppSummaryCategories.safeParse(key);
        expect(parseResult.success).toBe(true);
      }
    });
  });

  describe("Type Inference with Enum Keys", () => {
    it("should preserve type inference for specific category lookups", () => {
      // This is primarily a compile-time test that verifies TypeScript can infer
      // the specific schema type when accessing a known category key.

      // When accessing with a literal key, TypeScript should narrow the type
      const appDescEntry = appSummaryConfigMap.appDescription;
      const techEntry = appSummaryConfigMap.technologies;

      // These should be distinct entry objects
      expect(appDescEntry).not.toBe(techEntry);

      // Each entry should have its specific schema
      expect(appDescEntry.responseSchema).toBeDefined();
      expect(techEntry.responseSchema).toBeDefined();
    });

    it("should allow type-safe iteration over all categories", () => {
      // Iterate using the enum values as keys
      for (const category of validCategories) {
        const typedCategory: AppSummaryCategoryEnum = category;
        const entry: AppSummaryConfigMap[typeof typedCategory] = appSummaryConfigMap[typedCategory];

        // Type-safe access to entry properties
        expect(entry.contentDesc).toBeDefined();
        expect(typeof entry.contentDesc).toBe("string");
        expect(entry.instructions.length).toBeGreaterThan(0);
      }
    });

    it("should support indexed access with AppSummaryCategoryEnum type", () => {
      // This verifies that the Record<AppSummaryCategoryEnum, ...> type allows
      // indexed access with a variable of the enum type

      const testAccess = (category: AppSummaryCategoryEnum) => {
        const entry = appSummaryConfigMap[category];
        return entry.responseSchema;
      };

      // Test with each category
      for (const category of validCategories) {
        expect(testAccess(category)).toBeDefined();
      }
    });
  });

  describe("No Extra Keys Validation", () => {
    it("should not contain any keys outside of AppSummaryCategoryEnum", () => {
      // The satisfies constraint prevents adding invalid keys at compile time.
      // This test provides runtime verification.

      const configMapKeys = new Set(Object.keys(appSummaryConfigMap));
      const validCategorySet = new Set(validCategories);

      // Check that every key in the config map is a valid category
      for (const key of configMapKeys) {
        expect(validCategorySet.has(key as AppSummaryCategoryEnum)).toBe(true);
      }
    });
  });

  describe("Schema Association Correctness", () => {
    it("should associate the correct schema with each category", () => {
      // Verify that each category's schema produces objects with the expected key

      // appDescription schema should have 'appDescription' key
      const appDescShape = Object.keys(
        (appSummaryConfigMap.appDescription.responseSchema as { shape: Record<string, unknown> })
          .shape,
      );
      expect(appDescShape).toContain("appDescription");

      // technologies schema should have 'technologies' key
      const techShape = Object.keys(
        (appSummaryConfigMap.technologies.responseSchema as { shape: Record<string, unknown> })
          .shape,
      );
      expect(techShape).toContain("technologies");

      // businessProcesses schema should have 'businessProcesses' key
      const bpShape = Object.keys(
        (appSummaryConfigMap.businessProcesses.responseSchema as { shape: Record<string, unknown> })
          .shape,
      );
      expect(bpShape).toContain("businessProcesses");

      // boundedContexts schema should have 'boundedContexts' key
      const bcShape = Object.keys(
        (appSummaryConfigMap.boundedContexts.responseSchema as { shape: Record<string, unknown> })
          .shape,
      );
      expect(bcShape).toContain("boundedContexts");

      // potentialMicroservices schema should have 'potentialMicroservices' key
      const pmShape = Object.keys(
        (
          appSummaryConfigMap.potentialMicroservices.responseSchema as {
            shape: Record<string, unknown>;
          }
        ).shape,
      );
      expect(pmShape).toContain("potentialMicroservices");

      // inferredArchitecture schema should have 'inferredArchitecture' key
      const iaShape = Object.keys(
        (
          appSummaryConfigMap.inferredArchitecture.responseSchema as {
            shape: Record<string, unknown>;
          }
        ).shape,
      );
      expect(iaShape).toContain("inferredArchitecture");
    });
  });
});

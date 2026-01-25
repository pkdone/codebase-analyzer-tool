/**
 * Data extraction utility for inferred architecture visualization.
 *
 * This module provides functions for extracting inferred architecture data from
 * categorized app summary data for use in the current architecture diagram.
 */
import { z } from "zod";
import {
  inferredComponentSchema as coreInferredComponentSchema,
  externalDependencyComponentSchema,
  componentDependencySchema as coreComponentDependencySchema,
} from "../../../../schemas/app-summaries.schema";
import type { CategorizedSectionItem } from "../../data-processing/categorized-section-data-builder";
import type { InferredArchitectureData } from "../../diagrams/generators";

/**
 * Schema derived from core schemas for inferred architecture validation.
 * Uses base component schemas without .describe() metadata for cleaner validation.
 */
const inferredComponentSchema = coreInferredComponentSchema.pick({
  name: true,
  description: true,
});

/**
 * Schema derived from core externalDependencyComponentSchema.
 */
const externalDependencySchema = externalDependencyComponentSchema.pick({
  name: true,
  type: true,
  description: true,
});

/**
 * Schema derived from core componentDependencySchema.
 */
const componentDependencySchema = coreComponentDependencySchema.pick({
  from: true,
  to: true,
  description: true,
});

/**
 * Zod schema for inferred architecture category data.
 * Validates the structure from the categorizedData array.
 * Fields are required - invalid data will fail the type guard.
 */
const inferredArchitectureCategoryDataSchema = z.object({
  internalComponents: z.array(inferredComponentSchema),
  externalDependencies: z.array(externalDependencySchema),
  dependencies: z.array(componentDependencySchema),
});

/**
 * Type for inferred architecture category data extracted from Zod schema.
 * Used internally by isInferredArchitectureCategoryData type guard.
 */
type InferredArchitectureCategoryData = z.infer<typeof inferredArchitectureCategoryDataSchema>;

/**
 * Type guard to check if data is valid InferredArchitectureCategoryData.
 * Uses Zod schema validation for robust type checking.
 */
export function isInferredArchitectureCategoryData(
  data: unknown,
): data is InferredArchitectureCategoryData {
  return inferredArchitectureCategoryDataSchema.safeParse(data).success;
}

/**
 * Extracts inferred architecture data from categorized data.
 * Uses the discriminated union to automatically narrow the data type.
 *
 * @param categorizedData - Array of categorized section items from the report
 * @returns Inferred architecture data for diagram generation, or null if not found
 */
export function extractInferredArchitectureData(
  categorizedData: CategorizedSectionItem[],
): InferredArchitectureData | null {
  // Find the inferredArchitecture category - type is automatically narrowed
  const inferredArchitectureCategory = categorizedData.find(
    (item): item is Extract<CategorizedSectionItem, { category: "inferredArchitecture" }> =>
      item.category === "inferredArchitecture",
  );

  if (!inferredArchitectureCategory || inferredArchitectureCategory.data.length === 0) {
    return null;
  }

  // The data array contains a single item with the architecture structure
  // Use type guard to validate the structure before accessing properties
  const rawData = inferredArchitectureCategory.data[0];
  if (!isInferredArchitectureCategoryData(rawData)) {
    return null;
  }

  // Map the validated data to the output format
  return {
    internalComponents: rawData.internalComponents.map((c) => ({
      name: c.name,
      description: c.description,
    })),
    externalDependencies: rawData.externalDependencies.map((d) => ({
      name: d.name,
      type: d.type,
      description: d.description,
    })),
    dependencies: rawData.dependencies.map((dep) => ({
      from: dep.from,
      to: dep.to,
      description: dep.description,
    })),
  };
}

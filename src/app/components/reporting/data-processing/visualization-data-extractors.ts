/**
 * Data extraction utilities for visualization components.
 *
 * This module provides functions for safely extracting and normalizing data from
 * app summary records for use in visualization components like flowcharts,
 * domain model diagrams, and architecture diagrams.
 *
 * Functions include:
 * - extractKeyBusinessActivities: Extracts business activities from process data
 * - extractMicroserviceFields: Extracts and normalizes microservice-specific fields
 * - extractMicroservicesData: Extracts microservices from categorized data
 * - extractInferredArchitectureData: Extracts inferred architecture from categorized data
 * - isInferredArchitectureCategoryData: Type guard for inferred architecture validation
 */
import { z } from "zod";
import type { AppSummaryNameDescArray } from "../../../repositories/app-summaries/app-summaries.model";
import {
  businessProcessSchema,
  potentialMicroserviceSchema,
  inferredComponentSchema as coreInferredComponentSchema,
  externalDependencyComponentSchema,
  componentDependencySchema as coreComponentDependencySchema,
} from "../../../schemas/app-summaries.schema";
import type { CategorizedSectionItem } from "./categorized-section-data-builder";
import type { Microservice, InferredArchitectureData } from "../diagrams/generators";

/**
 * Schema derived from core businessProcessSchema for data extraction.
 * Picks only the fields needed for extracting keyBusinessActivities.
 * Uses partial() to make keyBusinessActivities optional for safe extraction.
 */
const businessProcessDataSchema = businessProcessSchema
  .pick({
    name: true,
    description: true,
    keyBusinessActivities: true,
  })
  .partial({
    keyBusinessActivities: true,
  });

/**
 * Type for business process data extracted from Zod schema.
 * Used internally for return type annotation.
 */
type BusinessProcessData = z.infer<typeof businessProcessDataSchema>;

/**
 * Type for a single business activity.
 * Non-undefined version for guaranteed return type.
 */
type BusinessActivity = NonNullable<BusinessProcessData["keyBusinessActivities"]>[number];

/**
 * Safely extracts keyBusinessActivities from an item.
 * Returns the activities if valid, otherwise returns an empty array.
 */
export function extractKeyBusinessActivities(item: AppSummaryNameDescArray[0]): BusinessActivity[] {
  const result = businessProcessDataSchema.safeParse(item);
  return result.success ? (result.data.keyBusinessActivities ?? []) : [];
}

/**
 * Schema derived from core potentialMicroserviceSchema for data extraction.
 * Picks only the fields needed for extracting microservice details.
 * Uses partial() to make entities, endpoints, and operations optional for safe extraction.
 */
const microserviceDataSchema = potentialMicroserviceSchema
  .pick({
    name: true,
    description: true,
    entities: true,
    endpoints: true,
    operations: true,
  })
  .partial({
    entities: true,
    endpoints: true,
    operations: true,
  });

/**
 * Normalized microservice entity with required attributes field.
 */
interface NormalizedMicroserviceEntity {
  name: string;
  description: string;
  attributes: string[];
}

/**
 * Normalized microservice endpoint.
 */
interface NormalizedMicroserviceEndpoint {
  path: string;
  method: string;
  description: string;
}

/**
 * Normalized microservice operation.
 */
interface NormalizedMicroserviceOperation {
  operation: string;
  method: string;
  description: string;
}

/**
 * Safely extracts microservice-specific fields from an item.
 * Returns validated data with defaults for missing optional fields.
 * All optional fields are normalized to have default values.
 */
export function extractMicroserviceFields(item: AppSummaryNameDescArray[0]): {
  entities: NormalizedMicroserviceEntity[];
  endpoints: NormalizedMicroserviceEndpoint[];
  operations: NormalizedMicroserviceOperation[];
} {
  const result = microserviceDataSchema.safeParse(item);
  if (result.success) {
    return {
      entities: (result.data.entities ?? []).map((entity) => ({
        name: entity.name,
        description: entity.description,
        attributes: entity.attributes ?? [],
      })),
      endpoints: result.data.endpoints ?? [],
      operations: result.data.operations ?? [],
    };
  }
  return { entities: [], endpoints: [], operations: [] };
}

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
 * Extracts microservices data from categorized data.
 * Uses the discriminated union to automatically narrow the data type.
 *
 * @param categorizedData - Array of categorized section items from the report
 * @returns Array of microservices with normalized structure for diagram generation
 */
export function extractMicroservicesData(
  categorizedData: CategorizedSectionItem[],
): Microservice[] {
  // Find the potentialMicroservices category - type is automatically narrowed
  const microservicesCategory = categorizedData.find(
    (item): item is Extract<CategorizedSectionItem, { category: "potentialMicroservices" }> =>
      item.category === "potentialMicroservices",
  );

  if (!microservicesCategory || microservicesCategory.data.length === 0) {
    return [];
  }

  // Data is now typed as PotentialMicroservicesArray - fields are guaranteed by schema
  return microservicesCategory.data.map((item) => ({
    name: item.name,
    description: item.description,
    entities: item.entities.map((entity) => ({
      name: entity.name,
      description: entity.description,
      attributes: entity.attributes ?? [], // attributes is optional in the schema
    })),
    endpoints: item.endpoints,
    operations: item.operations,
  }));
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

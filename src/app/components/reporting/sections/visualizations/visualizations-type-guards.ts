import { z } from "zod";
import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";

/**
 * Zod schema for business activity within a business process.
 * Validates the keyBusinessActivities array items.
 */
const businessActivitySchema = z.object({
  activity: z.string(),
  description: z.string(),
});

/**
 * Zod schema for business process data with keyBusinessActivities.
 * Extends the base name-description schema.
 */
const businessProcessDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  keyBusinessActivities: z.array(businessActivitySchema).optional(),
});

/**
 * Type for business process data extracted from Zod schema.
 * Used internally for return type annotation.
 */
type BusinessProcessData = z.infer<typeof businessProcessDataSchema>;

/**
 * Safely extracts keyBusinessActivities from an item.
 * Returns the activities if valid, otherwise returns an empty array.
 */
export function extractKeyBusinessActivities(
  item: AppSummaryNameDescArray[0],
): BusinessProcessData["keyBusinessActivities"] {
  const result = businessProcessDataSchema.safeParse(item);
  return result.success ? (result.data.keyBusinessActivities ?? []) : [];
}

/**
 * Zod schema for microservice entity.
 */
const microserviceEntitySchema = z.object({
  name: z.string(),
  description: z.string(),
  attributes: z.array(z.string()).optional(),
});

/**
 * Zod schema for microservice endpoint.
 */
const microserviceEndpointSchema = z.object({
  path: z.string(),
  method: z.string(),
  description: z.string(),
});

/**
 * Zod schema for microservice operation.
 */
const microserviceOperationSchema = z.object({
  operation: z.string(),
  method: z.string(),
  description: z.string(),
});

/**
 * Zod schema for microservice data.
 * Validates the full microservice structure with entities, endpoints, and operations.
 */
const microserviceDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  entities: z.array(microserviceEntitySchema).optional(),
  endpoints: z.array(microserviceEndpointSchema).optional(),
  operations: z.array(microserviceOperationSchema).optional(),
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
 * Zod schema for inferred internal component.
 */
const inferredComponentSchema = z.object({
  name: z.string(),
  description: z.string(),
});

/**
 * Zod schema for external dependency component.
 */
const externalDependencySchema = z.object({
  name: z.string(),
  type: z.string(),
  description: z.string(),
});

/**
 * Zod schema for component dependency relationship.
 */
const componentDependencySchema = z.object({
  from: z.string(),
  to: z.string(),
  description: z.string(),
});

/**
 * Zod schema for inferred architecture category data.
 * Validates the structure from the categorizedData array.
 */
const inferredArchitectureCategoryDataSchema = z.object({
  internalComponents: z.array(inferredComponentSchema).optional(),
  externalDependencies: z.array(externalDependencySchema).optional(),
  dependencies: z.array(componentDependencySchema).optional(),
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

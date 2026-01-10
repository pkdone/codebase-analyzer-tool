import { z } from "zod";
import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";
import {
  businessProcessSchema,
  potentialMicroserviceSchema,
  inferredComponentSchema as coreInferredComponentSchema,
  externalDependencyComponentSchema,
  componentDependencySchema as coreComponentDependencySchema,
} from "../../../../schemas/app-summaries.schema";

/**
 * Schema derived from core businessProcessSchema for type guard validation.
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
export function extractKeyBusinessActivities(
  item: AppSummaryNameDescArray[0],
): BusinessActivity[] {
  const result = businessProcessDataSchema.safeParse(item);
  return result.success ? (result.data.keyBusinessActivities ?? []) : [];
}

/**
 * Schema derived from core potentialMicroserviceSchema for type guard validation.
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

/**
 * Data extraction utilities for visualization components.
 *
 * This module provides general-purpose functions for safely extracting and normalizing
 * data from app summary records for use in visualization components.
 *
 * Note: Section-specific extractors (extractMicroservicesData, extractInferredArchitectureData)
 * have been moved to sections/visualizations/ where they are consumed, following the
 * principle of colocation.
 *
 * Functions include:
 * - extractKeyBusinessActivities: Extracts business activities from process data
 * - extractMicroserviceFields: Extracts and normalizes microservice-specific fields
 */
import { z } from "zod";
import type { AppSummaryNameDescArray } from "../../../repositories/app-summaries/app-summaries.model";
import {
  businessProcessSchema,
  potentialMicroserviceSchema,
} from "../../../schemas/app-summaries.schema";

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

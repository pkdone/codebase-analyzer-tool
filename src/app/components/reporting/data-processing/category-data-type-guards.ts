/**
 * Type guards and parsing utilities for categorized section data.
 * These utilities validate and transform app summary data into formats
 * suitable for report generation.
 *
 * This module provides:
 * - Category-specific array types derived from Zod schemas
 * - A discriminated union (CategorizedSectionItem) for type-safe access to category data
 * - Type guards and parsing utilities for runtime validation
 */
import { z } from "zod";
import {
  nameDescSchema,
  inferredArchitectureSchema,
  potentialMicroservicesSchema,
  boundedContextsSchema,
  businessProcessesSchema,
} from "../../../schemas/app-summaries.schema";
import type { AppSummaryNameDescArray } from "../../../repositories/app-summaries/app-summaries.model";

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

// Zod schema for validating AppSummaryNameDescArray
const appSummaryNameDescArraySchema = z.array(nameDescSchema);

// Schema for the inner inferredArchitecture object (unwrapped from the wrapper)
const inferredArchitectureInnerSchema = inferredArchitectureSchema.shape.inferredArchitecture;

// Schemas for category-specific arrays (extracted from wrapper schemas)
const potentialMicroservicesArraySchema = potentialMicroservicesSchema.shape.potentialMicroservices;
const boundedContextsArraySchema = boundedContextsSchema.shape.boundedContexts;
const businessProcessesArraySchema = businessProcessesSchema.shape.businessProcesses;

// =============================================================================
// Category-Specific Types
// =============================================================================

/**
 * Type for the inferred architecture data extracted from Zod schema.
 */
export type InferredArchitectureInner = z.infer<typeof inferredArchitectureInnerSchema>;

/**
 * Type for potential microservices array with rich data (entities, endpoints, operations).
 */
export type PotentialMicroservicesArray = z.infer<typeof potentialMicroservicesArraySchema>;

/**
 * Type for bounded contexts array with hierarchical structure (aggregates, entities, repositories).
 */
export type BoundedContextsArray = z.infer<typeof boundedContextsArraySchema>;

/**
 * Type for business processes array with key business activities.
 */
export type BusinessProcessesArray = z.infer<typeof businessProcessesArraySchema>;

// =============================================================================
// Discriminated Union Types
// =============================================================================

/**
 * Base type for all categorized section items.
 * Each variant is discriminated by the `category` literal type.
 */
interface BaseCategorizedItem<C extends string, D> {
  category: C;
  label: string;
  data: D;
}

/**
 * Discriminated union for categorized section data.
 * TypeScript can automatically narrow the `data` type based on the `category` discriminator.
 *
 * Usage:
 * ```typescript
 * if (item.category === 'potentialMicroservices') {
 *   // item.data is typed as PotentialMicroservicesArray
 *   item.data[0].entities; // OK
 * }
 * ```
 */
export type CategorizedSectionItem =
  | BaseCategorizedItem<"technologies", AppSummaryNameDescArray>
  | BaseCategorizedItem<"businessProcesses", BusinessProcessesArray>
  | BaseCategorizedItem<"boundedContexts", BoundedContextsArray>
  | BaseCategorizedItem<"potentialMicroservices", PotentialMicroservicesArray>
  | BaseCategorizedItem<"inferredArchitecture", InferredArchitectureInner[]>;

// =============================================================================
// Type Guards for Category-Specific Arrays
// =============================================================================

/**
 * Type guard to check if a value is an AppSummaryNameDescArray.
 * Uses Zod schema validation for robust type checking.
 */
export function isAppSummaryNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  return appSummaryNameDescArraySchema.safeParse(data).success;
}

/**
 * Type guard to check if a value is a PotentialMicroservicesArray.
 * Uses Zod schema validation for robust type checking.
 */
export function isPotentialMicroservicesArray(data: unknown): data is PotentialMicroservicesArray {
  return potentialMicroservicesArraySchema.safeParse(data).success;
}

/**
 * Type guard to check if a value is a BoundedContextsArray.
 * Uses Zod schema validation for robust type checking.
 */
export function isBoundedContextsArray(data: unknown): data is BoundedContextsArray {
  return boundedContextsArraySchema.safeParse(data).success;
}

/**
 * Type guard to check if a value is a BusinessProcessesArray.
 * Uses Zod schema validation for robust type checking.
 */
export function isBusinessProcessesArray(data: unknown): data is BusinessProcessesArray {
  return businessProcessesArraySchema.safeParse(data).success;
}

/**
 * Type guard to check if a value is InferredArchitectureInner[].
 */
function isInferredArchitectureInnerArray(data: unknown): data is InferredArchitectureInner[] {
  if (!Array.isArray(data)) {
    return false;
  }
  if (data.length === 0) {
    return true; // Empty array is valid
  }
  // Check if the first element matches the inferred architecture schema
  return inferredArchitectureInnerSchema.safeParse(data[0]).success;
}

/**
 * Type guard to check if a value is AppSummaryNameDescArray.
 * Useful when narrowing data from CategorizedSectionItem in report generation.
 */
export function isCategorizedDataNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  return isAppSummaryNameDescArray(data);
}

/**
 * Type guard to check if a value is InferredArchitectureInner[].
 * Useful when narrowing data from CategorizedSectionItem in report generation.
 */
export function isCategorizedDataInferredArchitecture(
  data: unknown,
): data is InferredArchitectureInner[] {
  return isInferredArchitectureInnerArray(data);
}

/**
 * Type guard to check if a value is a valid inferred architecture object.
 * Returns the parsed data if valid, or null if invalid.
 */
export function parseInferredArchitectureData(data: unknown): InferredArchitectureInner | null {
  const result = inferredArchitectureInnerSchema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Wraps the validated inferred architecture data in an array for compatibility with
 * the CategorizedSectionItem discriminated union interface.
 */
export function wrapInferredArchitectureAsArray(
  validatedData: InferredArchitectureInner,
): InferredArchitectureInner[] {
  return [validatedData];
}

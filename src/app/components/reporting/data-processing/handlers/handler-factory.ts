/**
 * Factory function for creating category data handlers.
 * Eliminates boilerplate by generating handlers from a category name and type guard.
 *
 * Most handlers follow the same pattern:
 * 1. Validate data with a type guard
 * 2. Return a CategorizedSectionItem with the data (or empty array if invalid)
 *
 * This factory encapsulates that pattern for consistent, DRY handler creation.
 */

import type { CategoryDataHandler, ProcessableCategory } from "./category-handler.interface";
import type {
  CategorizedSectionItem,
  InferredArchitectureInner,
  PotentialMicroservicesArray,
  BoundedContextsArray,
  BusinessProcessesArray,
} from "../category-data-type-guards";
import type { AppSummaryNameDescArray } from "../../../../repositories/app-summaries/app-summaries.model";

/**
 * Maps category types to their expected data types for type-safe handler creation.
 * This ensures compile-time verification that the type guard matches the category.
 */
export interface CategoryDataTypeMap {
  technologies: AppSummaryNameDescArray;
  businessProcesses: BusinessProcessesArray;
  boundedContexts: BoundedContextsArray;
  potentialMicroservices: PotentialMicroservicesArray;
  inferredArchitecture: InferredArchitectureInner[];
}

/**
 * Creates a type-safe category data handler using a type guard for validation.
 * The generic parameter C ensures the type guard matches the expected data type for the category.
 *
 * @param category - The category this handler processes (must match CategorizedSectionItem variants)
 * @param typeGuard - Function to validate that data matches the expected type for this category
 * @returns A CategoryDataHandler that validates and wraps data for the specified category
 *
 * @example
 * ```typescript
 * const technologiesHandler = createCategoryHandler(
 *   "technologies",
 *   isAppSummaryNameDescArray
 * );
 * ```
 */
export function createCategoryHandler<C extends ProcessableCategory>(
  category: C,
  typeGuard: (data: unknown) => data is CategoryDataTypeMap[C],
): CategoryDataHandler {
  return {
    category,
    process(label: string, fieldData: unknown): CategorizedSectionItem | null {
      const data: CategoryDataTypeMap[C] = typeGuard(fieldData)
        ? fieldData
        : ([] as CategoryDataTypeMap[C]);
      return { category, label, data } as CategorizedSectionItem;
    },
  };
}

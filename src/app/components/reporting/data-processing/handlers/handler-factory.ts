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
import type { CategorizedSectionItem } from "../category-data-type-guards";

/**
 * Creates a category data handler using a type guard for validation.
 *
 * @param category - The category this handler processes (must match CategorizedSectionItem variants)
 * @param typeGuard - Function to validate that data matches the expected type
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
export function createCategoryHandler(
  category: ProcessableCategory,
  typeGuard: (data: unknown) => boolean,
): CategoryDataHandler {
  return {
    category,
    process(label: string, fieldData: unknown): CategorizedSectionItem | null {
      return {
        category,
        label,
        data: typeGuard(fieldData) ? fieldData : [],
      } as CategorizedSectionItem;
    },
  };
}

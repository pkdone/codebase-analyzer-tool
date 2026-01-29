import type { CategorizedSectionItem } from "../category-data-type-guards";
import type { AppSummaryCategoryType } from "../../../insights/insights.types";

/**
 * Interface for category-specific data handlers.
 *
 * Implementing this interface allows adding new category handlers without modifying
 * the CategorizedSectionDataBuilder class (Open/Closed Principle).
 */
export interface CategoryDataHandler {
  /**
   * The category this handler processes.
   */
  readonly category: Exclude<AppSummaryCategoryType, "appDescription">;

  /**
   * Processes the raw field data and returns a CategorizedSectionItem.
   * Returns null if the data is invalid for this category.
   *
   * @param label - The display label for this category
   * @param fieldData - The raw data from the app summary
   * @returns A categorized section item, or null if invalid
   */
  process(label: string, fieldData: unknown): CategorizedSectionItem | null;
}

/**
 * Type for the category type discriminant.
 */
export type ProcessableCategory = Exclude<AppSummaryCategoryType, "appDescription">;

import { injectable } from "tsyringe";
import { getCategoryLabel } from "../../../config/category-labels.config";
import { AppSummaryCategories } from "../../../schemas/app-summaries.schema";
import type { AppSummaryCategoryType } from "../../insights/insights.types";
import type { AppSummaryRecordWithId } from "../../../repositories/app-summaries/app-summaries.model";
import {
  type CategorizedSectionItem,
  isAppSummaryNameDescArray,
  isPotentialMicroservicesArray,
  isBoundedContextsArray,
  isBusinessProcessesArray,
  parseInferredArchitectureData,
  wrapInferredArchitectureAsArray,
} from "./category-data-type-guards";

// Re-export types and type guards that consumers may need
export type { CategorizedSectionItem, BoundedContextsArray } from "./category-data-type-guards";
export { isCategorizedDataNameDescArray } from "./category-data-type-guards";

/**
 * Builds categorized section data from app summary records for report generation.
 * Transforms and validates app summary data into a format suitable for report sections.
 *
 * Returns a discriminated union (CategorizedSectionItem[]) where each item's `data` type
 * is narrowed based on the `category` discriminator.
 */
@injectable()
export class CategorizedSectionDataBuilder {
  /**
   * Build categorized data for standard (tabular) categories using pre-fetched app summary data.
   * Excludes categories that have custom dedicated sections in the report.
   *
   * Returns a discriminated union where each category has its own strongly-typed data:
   * - technologies: AppSummaryNameDescArray
   * - businessProcesses: BusinessProcessesArray (with keyBusinessActivities)
   * - boundedContexts: BoundedContextsArray (hierarchical structure)
   * - potentialMicroservices: PotentialMicroservicesArray (with entities, endpoints, operations)
   * - inferredArchitecture: InferredArchitectureInner[]
   */
  getStandardSectionData(
    appSummaryData: Pick<AppSummaryRecordWithId, AppSummaryCategoryType>,
  ): CategorizedSectionItem[] {
    // Exclude appDescription which is rendered separately in the overview section
    // Note: boundedContexts is included here because the DomainModelTransformer needs it
    const standardCategoryKeys = AppSummaryCategories.options.filter(
      (key): key is Exclude<AppSummaryCategoryType, "appDescription"> => key !== "appDescription",
    );

    const results: CategorizedSectionItem[] = [];

    for (const category of standardCategoryKeys) {
      const label = getCategoryLabel(category);
      const fieldData = appSummaryData[category];

      // Build category-specific items with proper type narrowing
      const item = this.buildCategorizedItem(category, label, fieldData);
      if (item !== null) {
        results.push(item);
        console.log(`Generated ${label} table`);
      }
    }

    return results;
  }

  /**
   * Builds a categorized item with the correct data type based on category.
   * Returns null if the data is invalid for the category.
   */
  private buildCategorizedItem(
    category: Exclude<AppSummaryCategoryType, "appDescription">,
    label: string,
    fieldData: unknown,
  ): CategorizedSectionItem | null {
    switch (category) {
      case "technologies":
        return {
          category,
          label,
          data: isAppSummaryNameDescArray(fieldData) ? fieldData : [],
        };

      case "businessProcesses":
        return {
          category,
          label,
          data: isBusinessProcessesArray(fieldData) ? fieldData : [],
        };

      case "boundedContexts":
        return {
          category,
          label,
          data: isBoundedContextsArray(fieldData) ? fieldData : [],
        };

      case "potentialMicroservices":
        return {
          category,
          label,
          data: isPotentialMicroservicesArray(fieldData) ? fieldData : [],
        };

      case "inferredArchitecture": {
        const parsedArchData = parseInferredArchitectureData(fieldData);
        return {
          category,
          label,
          data: parsedArchData !== null ? wrapInferredArchitectureAsArray(parsedArchData) : [],
        };
      }
    }
  }
}

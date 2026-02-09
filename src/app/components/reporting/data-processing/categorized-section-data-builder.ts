import { injectable } from "tsyringe";
import { getCategoryLabel } from "../../../config/category-labels.config";
import { AppSummaryCategories } from "../../../schemas/app-summaries.schema";
import type { AppSummaryCategoryType } from "../../insights/insights.types";
import type { AppSummaryRecordWithId } from "../../../repositories/app-summaries/app-summaries.model";
import type { CategorizedSectionItem } from "./category-data-type-guards";
import type { CategoryDataHandler, ProcessableCategory } from "./handlers";
import {
  technologiesHandler,
  businessProcessesHandler,
  boundedContextsHandler,
  potentialMicroservicesHandler,
  inferredArchitectureHandler,
} from "./handlers";

// Re-export types and type guards that consumers may need
export type { CategorizedSectionItem, BoundedContextsArray } from "./category-data-type-guards";
export { isCategorizedDataNameDescArray } from "./category-data-type-guards";

/**
 * Registry of category handlers.
 * Maps each processable category to its corresponding handler.
 *
 * To add a new category:
 * 1. Create a new handler in ./handlers/
 * 2. Add it to this registry
 */
const categoryHandlers: ReadonlyMap<ProcessableCategory, CategoryDataHandler> = new Map([
  [technologiesHandler.category, technologiesHandler],
  [businessProcessesHandler.category, businessProcessesHandler],
  [boundedContextsHandler.category, boundedContextsHandler],
  [potentialMicroservicesHandler.category, potentialMicroservicesHandler],
  [inferredArchitectureHandler.category, inferredArchitectureHandler],
]);

/**
 * Builds categorized section data from app summary records for report generation.
 * Transforms and validates app summary data into a format suitable for report sections.
 *
 * Uses a handler registry pattern (Open/Closed Principle) - new categories can be added
 * by creating new handlers without modifying this class.
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
      (key): key is ProcessableCategory => key !== "appDescription",
    );

    const results: CategorizedSectionItem[] = [];

    for (const category of standardCategoryKeys) {
      const label = getCategoryLabel(category);
      const fieldData = appSummaryData[category];

      // Use handler registry to process each category
      const item = this.processCategory(category, label, fieldData);

      if (item !== null) {
        results.push(item);
        console.log(`Generated ${label} table`);
      }
    }

    return results;
  }

  /**
   * Processes a category using its registered handler.
   * Returns null if no handler is registered or if data is invalid.
   */
  private processCategory(
    category: ProcessableCategory,
    label: string,
    fieldData: unknown,
  ): CategorizedSectionItem | null {
    const handler = categoryHandlers.get(category);

    if (!handler) {
      console.warn(`No handler registered for category: ${category}`);
      return null;
    }

    return handler.process(label, fieldData);
  }
}

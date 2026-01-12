import { injectable } from "tsyringe";
import { getCategoryLabel } from "../../../../config/category-labels.config";
import { AppSummaryCategories } from "../../../../schemas/app-summaries.schema";
import type { AppSummaryCategoryType } from "../../../insights/insights.types";
import type { AppSummaryRecordWithId } from "../../../../repositories/app-summaries/app-summaries.model";
import {
  type CategorizedDataItem,
  isAppSummaryNameDescArray,
  parseInferredArchitectureData,
  wrapInferredArchitectureAsArray,
} from "./category-data-type-guards";

// Re-export types and type guards that consumers may need
export type { CategorizedDataItem } from "./category-data-type-guards";
export {
  isCategorizedDataNameDescArray,
  isCategorizedDataInferredArchitecture,
} from "./category-data-type-guards";

/**
 * Builds categorized section data from app summary records for report generation.
 * Transforms and validates app summary data into a format suitable for report sections.
 */
@injectable()
export class CategorizedSectionDataBuilder {
  /**
   * Build categorized data for standard (tabular) categories using pre-fetched app summary data.
   * Excludes categories that have custom dedicated sections in the report.
   */
  getStandardSectionData(
    appSummaryData: Pick<AppSummaryRecordWithId, AppSummaryCategoryType>,
  ): { category: string; label: string; data: CategorizedDataItem }[] {
    // Exclude appDescription which is rendered separately in the overview section
    // Note: boundedContexts is included here because the DomainModelDataProvider needs it
    const standardCategoryKeys = AppSummaryCategories.options.filter(
      (key): key is AppSummaryCategoryType => key !== "appDescription",
    );
    return standardCategoryKeys.map((category: AppSummaryCategoryType) => {
      const label = getCategoryLabel(category);
      const fieldData = appSummaryData[category];

      // Handle inferredArchitecture specially - it's an object, not an array
      // Wrap it in an array so it can be processed by ArchitectureAndDomainSection
      let data: CategorizedDataItem;
      if (category === "inferredArchitecture") {
        const parsedArchData = parseInferredArchitectureData(fieldData);
        data = parsedArchData !== null ? wrapInferredArchitectureAsArray(parsedArchData) : [];
      } else {
        data = isAppSummaryNameDescArray(fieldData) ? fieldData : [];
      }

      console.log(`Generated ${label} table`);
      return {
        category,
        label,
        data,
      };
    });
  }
}

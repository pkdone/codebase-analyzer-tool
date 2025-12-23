import { injectable } from "tsyringe";
import { z } from "zod";
import { promptRegistry } from "../../../../prompts/prompt-registry";
import { AppSummaryCategories, nameDescSchema } from "../../../../schemas/app-summaries.schema";
import type { AppSummaryCategoryType } from "../../../insights/insights.types";
import type {
  AppSummaryNameDescArray,
  AppSummaryRecordWithId,
} from "../../../../repositories/app-summaries/app-summaries.model";

// Zod schema for validating AppSummaryNameDescArray
const appSummaryNameDescArraySchema = z.array(nameDescSchema);

/**
 * Type guard to check if a value is an AppSummaryNameDescArray
 * Uses Zod schema validation for robust type checking.
 */
function isAppSummaryNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  return appSummaryNameDescArraySchema.safeParse(data).success;
}

/**
 * Data provider responsible for aggregating app summary categorized data for reports.
 */
@injectable()
export class AppSummaryCategoriesProvider {
  /**
   * Build categorized data for standard (tabular) categories using pre-fetched app summary data.
   * Excludes categories that have custom dedicated sections in the report.
   */
  getStandardSectionData(
    appSummaryData: Pick<AppSummaryRecordWithId, AppSummaryCategoryType>,
  ): { category: string; label: string; data: AppSummaryNameDescArray }[] {
    // Exclude appDescription & boundedContexts which have decicated visualizations
    const standardCategoryKeys = AppSummaryCategories.options.filter(
      (key): key is AppSummaryCategoryType => key !== "appDescription" && key !== "boundedContexts",
    );
    return standardCategoryKeys.map((category: AppSummaryCategoryType) => {
      const config = promptRegistry.appSummaries[category];
      const label = config.label ?? category;
      const fieldData = appSummaryData[category];
      const data = isAppSummaryNameDescArray(fieldData) ? fieldData : [];
      console.log(`Generated ${label} table`);
      return {
        category,
        label,
        data,
      };
    });
  }
}

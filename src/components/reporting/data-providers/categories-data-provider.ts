import { injectable } from "tsyringe";
import { z } from "zod";
import { summaryCategoriesConfig } from "../../../config/insights-generation.config";
import { AppSummaryCategories, nameDescSchema } from "../../../schemas/app-summaries.schema";
import type {
  AppSummaryNameDescArray,
  AppSummaryRecordWithId,
} from "../../../repositories/app-summary/app-summaries.model";

/**
 * Key for the app description field
 */
const APP_DESCRIPTION_KEY = "appDescription";

// Zod schema for validating AppSummaryNameDescArray
const appSummaryNameDescArraySchema = z.array(nameDescSchema);

/**
 * Type guard to check if a value is an AppSummaryNameDescArray
 * Uses Zod schema validation for robust type checking.
 */
function isAppSummaryNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  return appSummaryNameDescArraySchema.safeParse(data).success;
}

// Define valid category keys for generating structured table reports, excluding appDescription
// This creates a type-safe readonly array of the valid keys
const TABLE_DISPLAY_CATEGORIES = AppSummaryCategories.options.filter(
  (key): key is Exclude<typeof AppSummaryCategories._type, typeof APP_DESCRIPTION_KEY> =>
    key !== APP_DESCRIPTION_KEY,
);

// Type for the valid category keys
type ValidCategoryKey = (typeof TABLE_DISPLAY_CATEGORIES)[number];

/**
 * Data provider responsible for aggregating categorized data for reports.
 */
@injectable()
export class CategoriesDataProvider {
  /**
   * Build categorized data for all categories using pre-fetched app summary data.
   */
  getCategorizedData(
    appSummaryData: Pick<AppSummaryRecordWithId, ValidCategoryKey>,
  ): { category: string; label: string; data: AppSummaryNameDescArray }[] {
    const results = TABLE_DISPLAY_CATEGORIES.map((category: ValidCategoryKey) => {
      const config = summaryCategoriesConfig[category as keyof typeof summaryCategoriesConfig];
      const label = config.label;
      const fieldData = appSummaryData[category];
      const data = isAppSummaryNameDescArray(fieldData) ? fieldData : [];
      console.log(`Generated ${label} table`);
      return {
        category,
        label,
        data,
      };
    });
    return results;
  }
}

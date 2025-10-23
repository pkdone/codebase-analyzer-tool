import { injectable } from "tsyringe";
import { z } from "zod";
import { appSummaryPromptMetadata as summaryCategoriesConfig } from "../../../prompt-templates/app-summaries.prompts";
import { AppSummaryCategories, nameDescSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryCategoryType } from "../../../prompt-templates/app-summaries.types";
import type {
  AppSummaryNameDescArray,
  AppSummaryRecordWithId,
} from "../../../repositories/app-summaries/app-summaries.model";

/**
 * Categories that have dedicated custom sections and should not be rendered in the generic category loop
 */
const CATEGORIES_WITH_CUSTOM_SECTIONS = [
  "appDescription",
  "billOfMaterials",
  "codeQualitySummary",
  "scheduledJobsSummary",
  "moduleCoupling",
  "uiTechnologyAnalysis",
] as const;

// Zod schema for validating AppSummaryNameDescArray
const appSummaryNameDescArraySchema = z.array(nameDescSchema);

/**
 * Type guard to check if a value is an AppSummaryNameDescArray
 * Uses Zod schema validation for robust type checking.
 */
function isAppSummaryNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  return appSummaryNameDescArraySchema.safeParse(data).success;
}

// Type representing categories that should be excluded from generic rendering
type CategoryWithCustomSection = (typeof CATEGORIES_WITH_CUSTOM_SECTIONS)[number];

// Define valid category keys for generating structured table reports, excluding categories with custom sections
// This creates a type-safe readonly array of the valid keys
const TABLE_CATEGORY_KEYS = AppSummaryCategories.options.filter(
  (key): key is Exclude<AppSummaryCategoryType, CategoryWithCustomSection> =>
    !(CATEGORIES_WITH_CUSTOM_SECTIONS as readonly string[]).includes(key),
);

// Type for the valid category keys
type ValidCategoryKey = (typeof TABLE_CATEGORY_KEYS)[number];

/**
 * Data provider responsible for aggregating app summary categorized data for reports.
 */
@injectable()
export class AppSummaryCategoriesProvider {
  /**
   * Build categorized data for all categories using pre-fetched app summary data.
   */
  getCategorizedData(
    appSummaryData: Pick<AppSummaryRecordWithId, ValidCategoryKey>,
  ): { category: string; label: string; data: AppSummaryNameDescArray }[] {
    const results = TABLE_CATEGORY_KEYS.map((category: ValidCategoryKey) => {
      const config = summaryCategoriesConfig[category];
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

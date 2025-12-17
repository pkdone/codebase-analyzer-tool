import { injectable, injectAll } from "tsyringe";
import { z } from "zod";
import { appSummaryPromptMetadata as summaryCategoriesConfig } from "../../../prompts/definitions/app-summaries";
import { AppSummaryCategories, nameDescSchema } from "../../../schemas/app-summaries.schema";
import type { AppSummaryCategoryType } from "../../insights/insights.types";
import type {
  AppSummaryNameDescArray,
  AppSummaryRecordWithId,
} from "../../../repositories/app-summaries/app-summaries.model";
import type { ReportSection } from "../sections/report-section.interface";

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
  constructor(@injectAll("ReportSection") private readonly reportSections: ReportSection[]) {}

  /**
   * Build categorized data for standard (tabular) categories using pre-fetched app summary data.
   * Excludes categories that have custom dedicated sections in the report.
   */
  getStandardSectionData(
    appSummaryData: Pick<AppSummaryRecordWithId, AppSummaryCategoryType>,
  ): { category: string; label: string; data: AppSummaryNameDescArray }[] {
    // Get categories that have custom sections (non-standard sections)
    const customSectionCategories = this.getCustomSectionCategories();

    // Filter to only standard categories
    const standardCategoryKeys = AppSummaryCategories.options.filter(
      (key): key is AppSummaryCategoryType =>
        !customSectionCategories.has(key) && key !== "appDescription",
    );

    const results = standardCategoryKeys.map((category: AppSummaryCategoryType) => {
      const config = summaryCategoriesConfig[category];
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
    return results;
  }

  /**
   * Determines which categories have custom sections based on injected report sections.
   * This makes the category filtering declarative rather than hardcoded.
   */
  private getCustomSectionCategories(): Set<string> {
    const customCategories = new Set<string>();

    for (const section of this.reportSections) {
      if (!section.isStandardSection()) {
        // AdvancedDataSection handles custom rendering for BOM, code quality, etc.
        // These categories are no longer in AppSummaryCategories, so they won't appear in standard sections anyway
        // Add other custom sections as needed
      }
    }

    return customCategories;
  }
}

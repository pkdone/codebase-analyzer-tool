import { injectable, inject } from "tsyringe";
import { appConfig } from "../../../config/app.config";
import { summaryCategoriesConfig } from "../../insights/insights.config";
import { AppSummaryCategories } from "../../../schemas/app-summaries.schema";
import type { AppSummariesRepository } from "../../../repositories/app-summary/app-summaries.repository.interface";
import type { AppSummaryNameDescArray } from "../../../repositories/app-summary/app-summaries.model";
import { TOKENS } from "../../../di/tokens";

/**
 * Type guard to check if a value is an AppSummaryNameDescArray
 * Optimized to check only the first element as a representative sample
 * for better performance with large arrays.
 */
function isAppSummaryNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  if (!Array.isArray(data)) return false;
  if (data.length === 0) return true;
  const firstItem: unknown = data[0];
  if (typeof firstItem !== "object" || firstItem === null) return false;
  const obj = firstItem as Record<string, unknown>;
  return (
    "name" in obj &&
    "description" in obj &&
    typeof obj.name === "string" &&
    typeof obj.description === "string"
  );
}

// Define valid category keys that can be used for data fetching, excluding appDescription
// This creates a type-safe readonly array of the valid keys
const REPORTABLE_INSIGHT_CATEGORIES = AppSummaryCategories.options.filter(
  (key): key is Exclude<typeof AppSummaryCategories._type, typeof appConfig.APP_DESCRIPTION_KEY> =>
    key !== appConfig.APP_DESCRIPTION_KEY,
);

// Type for the valid category keys
type ValidCategoryKey = (typeof REPORTABLE_INSIGHT_CATEGORIES)[number];

/**
 * Data provider responsible for aggregating categorized data for reports.
 */
@injectable()
export class CategoriesDataProvider {
  constructor(
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
  ) {}

  /**
   * Build categorized data for all categories.
   */
  async getCategorizedData(
    projectName: string,
  ): Promise<{ category: string; label: string; data: AppSummaryNameDescArray }[]> {
    const allCategoryData = await this.appSummariesRepository.getProjectAppSummaryFields(
      projectName,
      REPORTABLE_INSIGHT_CATEGORIES,
    );
    const results = REPORTABLE_INSIGHT_CATEGORIES.map((category: ValidCategoryKey) => {
      const label = summaryCategoriesConfig[category].label;
      const fieldData = allCategoryData?.[category];
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

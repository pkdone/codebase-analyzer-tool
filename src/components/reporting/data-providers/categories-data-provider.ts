import { injectable, inject } from "tsyringe";
import { appConfig } from "../../../config/app.config";
import { summaryCategoriesConfig } from "../../insights/insights.config";
import { AppSummaryCategories } from "../../../schemas/app-summaries.schema";
import type { AppSummariesRepository } from "../../../repositories/app-summary/app-summaries.repository.interface";
import type {
  AppSummaryRecord,
  AppSummaryNameDescArray,
} from "../../../repositories/app-summary/app-summaries.model";
import { TOKENS } from "../../../di/tokens";

/**
 * Type guard to check if a value is an AppSummaryNameDescArray
 */
function isAppSummaryNameDescArray(data: unknown): data is AppSummaryNameDescArray {
  return (
    Array.isArray(data) &&
    data.every(
      (item) =>
        typeof item === "object" && item !== null && "name" in item && "description" in item,
    )
  );
}

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
    const categoryKeys = AppSummaryCategories.options.filter(
      (key) => key !== appConfig.APP_DESCRIPTION_KEY,
    );
    const categoryPromises = categoryKeys.map(async (category) => {
      const label = summaryCategoriesConfig[category].label;
      // TODO: Could call new repo method which gets all categories in one go
      const result = await this.appSummariesRepository.getProjectAppSummaryField(
        projectName,
        category as keyof AppSummaryRecord,
      );
      const data = isAppSummaryNameDescArray(result) ? result : [];
      console.log(`Generated ${label} table`);
      return {
        category,
        label,
        data,
      };
    });

    return await Promise.all(categoryPromises);
  }
}

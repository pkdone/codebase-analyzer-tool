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
function isAppSummaryNameDescArray(value: unknown): value is AppSummaryNameDescArray {
  return (
    Array.isArray(value) &&
    (value.length === 0 ||
      (typeof value[0] === "object" &&
        value[0] !== null &&
        "name" in value[0] &&
        "description" in value[0]))
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
    const categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[] =
      [];

    for (const category of categoryKeys) {
      const label = summaryCategoriesConfig[category].label;
      // TODO: Could call new repo method which gets all categories in one go
      const result = await this.appSummariesRepository.getProjectAppSummaryField(
        projectName,
        category as keyof AppSummaryRecord,
      );

      // Use the type guard instead of unsafe assertion
      const data = isAppSummaryNameDescArray(result) ? result : [];
      categorizedData.push({
        category,
        label,
        data,
      });
      console.log(`Generated ${label} table`);
    }

    return categorizedData;
  }
}

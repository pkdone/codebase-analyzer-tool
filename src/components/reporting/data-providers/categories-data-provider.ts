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
      const data = result ? (result as AppSummaryNameDescArray) : [];
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

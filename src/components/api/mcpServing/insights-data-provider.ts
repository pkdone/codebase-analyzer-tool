import { injectable, inject } from "tsyringe";
import type { AppSummariesRepository } from "../../../repositories/app-summary/app-summaries.repository.interface";
import { TOKENS } from "../../../tokens";
import { AppSummaryRecordWithId } from "../../../repositories/app-summary/app-summaries.model";
import { AppSummaryCategories } from "../../../schemas/app-summaries.schema";

/**
 * Class to handle analysis data server operations.
 */
@injectable()
export default class InsightsDataProvider {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
  ) {}

  /**
   * Retrieves a list of business processes from the database.
   */
  async getBusinessProcesses(): Promise<
    AppSummaryRecordWithId[typeof AppSummaryCategories.Enum.businessProcesses] | null
  > {
    return await this.appSummariesRepository.getProjectAppSummaryField(
      this.projectName,
      AppSummaryCategories.Enum.businessProcesses,
    );
  }
}

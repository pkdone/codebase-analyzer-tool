import { injectable, inject } from "tsyringe";
import type { AppSummariesRepository } from "../../../repositories/app-summary/app-summaries.repository.interface";
import { TOKENS } from "../../../di/tokens";
import { AppSummaryRecordWithId } from "../../../repositories/app-summary/app-summaries.model";

const BUSINESS_PROCESSES_FIELD = "businessProcesses" as const;

/**
 * Class to handle analysis data server operations.
 */
@injectable()
export default class InsightsDataServer {
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
    AppSummaryRecordWithId[typeof BUSINESS_PROCESSES_FIELD] | null
  > {
    return await this.appSummariesRepository.getProjectAppSummaryField(
      this.projectName,
      BUSINESS_PROCESSES_FIELD,
    );
  }
}

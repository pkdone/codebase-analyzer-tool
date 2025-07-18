import { injectable, inject } from "tsyringe";
import type { AppSummariesRepository } from "../../../repositories/app-summary/app-summaries.repository.interface";
import type { AppSummaryNameDescArray } from "../../../repositories/app-summary/app-summaries.model";
import { TOKENS } from "../../../di/tokens";
import { appSummaryNameDescArraySchema } from "../../../repositories/app-summary/app-summaries.model";

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
  async getBusinessProcesses(): Promise<AppSummaryNameDescArray> {
    const busProcesses = await this.appSummariesRepository.getProjectAppSummaryField(
      this.projectName,
      "businessProcesses" as const,
    );
    const parsed = appSummaryNameDescArraySchema.safeParse(busProcesses);
    return parsed.success ? parsed.data : [];
  }
}

import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../../di/tokens";
import { fileProcessingRules } from "../../../../config/file-handling/file-processing-rules";
import type { ScheduledJobsSummary } from "./quality-metrics.types";
import { extractTriggerType } from "./job-trigger-parser";

/**
 * Type for a single job item
 */
type ScheduledJobItem = ScheduledJobsSummary["jobs"][0];

/**
 * Data provider responsible for aggregating scheduled jobs and batch processes from script files.
 * Identifies scheduled jobs (cron, task scheduler), shell scripts, JCL, and other automated processes.
 */
@injectable()
export class ScheduledJobDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates all scheduled jobs from script files for a project
   */
  async getScheduledJobsSummary(projectName: string): Promise<ScheduledJobsSummary> {
    // Fetch all script files with scheduled jobs
    const scriptFiles = await this.sourcesRepository.getProjectSourcesSummariesByCanonicalType(
      projectName,
      [...fileProcessingRules.SCHEDULED_JOB_CANONICAL_TYPES],
    );

    const jobsList: ScheduledJobItem[] = [];
    const triggerTypesSet = new Set<string>();
    const jobFilePaths: string[] = [];

    // Aggregate jobs from all script files
    for (const file of scriptFiles) {
      if (!file.summary?.scheduledJobs || file.summary.scheduledJobs.length === 0) {
        continue;
      }

      jobFilePaths.push(file.filepath);

      for (const job of file.summary.scheduledJobs) {
        jobsList.push({
          jobName: job.jobName,
          sourceFile: file.filepath,
          trigger: job.trigger,
          purpose: job.purpose,
          inputResources: job.inputResources,
          outputResources: job.outputResources,
          dependencies: job.dependencies,
        });

        // Extract trigger type (e.g., "cron" from "cron: 0 2 * * *")
        const triggerType = extractTriggerType(job.trigger);
        triggerTypesSet.add(triggerType);
      }
    }

    // Sort jobs by job name for consistent ordering
    const sortedJobs = jobsList.toSorted((a, b) => a.jobName.localeCompare(b.jobName));

    return {
      jobs: sortedJobs,
      totalJobs: jobsList.length,
      triggerTypes: Array.from(triggerTypesSet).toSorted(),
      jobFiles: jobFilePaths,
    };
  }
}

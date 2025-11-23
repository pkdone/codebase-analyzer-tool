import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import type { IAggregator } from "./aggregator.interface";
import type { AppSummaryCategoryEnum } from "../insights.types";
import type { z } from "zod";
import {
  scheduledJobsSummarySchema,
  scheduledJobSummaryItemSchema,
} from "../../../schemas/app-summaries.schema";

/**
 * Type for the scheduled jobs aggregation result (inferred from Zod schema)
 */
export type ScheduledJobsAggregationResult = z.infer<typeof scheduledJobsSummarySchema>;

/**
 * Type for a single job item (inferred from Zod schema)
 */
type ScheduledJobItem = z.infer<typeof scheduledJobSummaryItemSchema>;

/**
 * Aggregates scheduled jobs and batch processes from script files.
 * Identifies batch jobs, shell scripts, JCL, and other automated processes.
 */
@injectable()
export class JobAggregator implements IAggregator<ScheduledJobsAggregationResult> {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  getCategory(): AppSummaryCategoryEnum {
    return "scheduledJobsSummary";
  }

  /**
   * Aggregates all scheduled jobs from script files for a project
   */
  async aggregate(projectName: string): Promise<ScheduledJobsAggregationResult> {
    // Fetch all script files with scheduled jobs
    const scriptFiles = await this.sourcesRepository.getProjectSourcesSummaries(projectName, [
      "shell-script",
      "batch-script",
      "jcl",
    ]);

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
        const triggerType = this.extractTriggerType(job.trigger);
        triggerTypesSet.add(triggerType);
      }
    }

    // Sort jobs by job name for consistent ordering
    jobsList.sort((a, b) => a.jobName.localeCompare(b.jobName));

    return {
      jobs: jobsList,
      totalJobs: jobsList.length,
      triggerTypes: Array.from(triggerTypesSet).sort(),
      jobFiles: jobFilePaths,
    };
  }

  /**
   * Extracts the trigger type from a trigger string
   * Examples: "cron: 0 2 * * *" -> "cron", "manual" -> "manual"
   */
  private extractTriggerType(trigger: string): string {
    const normalized = trigger.toLowerCase().trim();

    if (normalized.startsWith("cron")) {
      return "cron";
    }
    if (normalized.includes("scheduled") || normalized.includes("schedule")) {
      return "scheduled";
    }
    if (normalized.includes("manual")) {
      return "manual";
    }
    if (normalized.includes("event")) {
      return "event-driven";
    }
    if (normalized.includes("systemd") || normalized.includes("timer")) {
      return "systemd-timer";
    }
    if (normalized.includes("task scheduler") || normalized.includes("schtasks")) {
      return "task-scheduler";
    }

    // Default to the first word if we can't categorize it
    const firstWord = normalized.split(/[\s:,]/)[0];
    return firstWord || "unknown";
  }
}

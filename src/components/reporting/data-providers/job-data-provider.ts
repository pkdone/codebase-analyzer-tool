import { injectable, inject } from "tsyringe";
import type { SourcesRepository } from "../../../repositories/sources/sources.repository.interface";
import { repositoryTokens } from "../../../di/tokens";
import type { ScheduledJobsSummary } from "../report-gen.types";

/**
 * Type for the scheduled jobs aggregation result
 */
export type ScheduledJobsAggregationResult = ScheduledJobsSummary;

/**
 * Type for a single job item
 */
type ScheduledJobItem = ScheduledJobsSummary["jobs"][0];

/**
 * Pattern definition for trigger type matching.
 * Each pattern has a match function and the resulting type string.
 */
export interface TriggerTypePattern {
  readonly match: (normalized: string) => boolean;
  readonly type: string;
}

/**
 * Data-driven trigger type patterns for categorizing job triggers.
 * Patterns are evaluated in order; first match wins.
 * More specific patterns (e.g., "task-scheduler") must come before broader patterns (e.g., "scheduled").
 * This approach makes it easy to add, remove, or reorder trigger patterns.
 */
export const TRIGGER_TYPE_PATTERNS: readonly TriggerTypePattern[] = [
  { match: (s) => s.startsWith("cron"), type: "cron" },
  { match: (s) => s.includes("task scheduler") || s.includes("schtasks"), type: "task-scheduler" },
  { match: (s) => s.includes("scheduled") || s.includes("schedule"), type: "scheduled" },
  { match: (s) => s.includes("manual"), type: "manual" },
  { match: (s) => s.includes("event"), type: "event-driven" },
  { match: (s) => s.includes("systemd") || s.includes("timer"), type: "systemd-timer" },
] as const;

/**
 * Extracts the trigger type from a trigger string using data-driven pattern matching.
 * Exported for testability while also being used internally by JobDataProvider.
 *
 * @param trigger - The trigger string to categorize (e.g., "cron: 0 2 * * *")
 * @returns The categorized trigger type (e.g., "cron", "manual", "scheduled")
 */
export function extractTriggerType(trigger: string): string {
  const normalized = trigger.toLowerCase().trim();

  // Find first matching pattern
  const matchedPattern = TRIGGER_TYPE_PATTERNS.find((pattern) => pattern.match(normalized));
  if (matchedPattern) {
    return matchedPattern.type;
  }

  // Default to the first word if no pattern matches
  const firstWord = normalized.split(/[\s:,]/)[0];
  return firstWord || "unknown";
}

/**
 * Data provider responsible for aggregating scheduled jobs and batch processes from script files.
 * Identifies batch jobs, shell scripts, JCL, and other automated processes.
 */
@injectable()
export class JobDataProvider {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
  ) {}

  /**
   * Aggregates all scheduled jobs from script files for a project
   */
  async getScheduledJobsSummary(projectName: string): Promise<ScheduledJobsAggregationResult> {
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
        const triggerType = extractTriggerType(job.trigger);
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
}

/**
 * Types for the background processes (scheduled jobs) report section.
 */

/**
 * Interface for scheduled jobs summary information
 */
export interface ScheduledJobsSummary {
  jobs: {
    jobName: string;
    sourceFile: string;
    trigger: string;
    purpose: string;
    inputResources?: string[];
    outputResources?: string[];
    dependencies?: string[];
  }[];
  totalJobs: number;
  triggerTypes: string[];
  jobFiles: string[];
}

/**
 * Interface for scheduled jobs statistics used in HTML report rendering.
 */
export interface JobsStatistics {
  /** Total number of scheduled jobs */
  total: number;
  /** Number of unique trigger types */
  triggerTypesCount: number;
  /** Number of job files */
  jobFilesCount: number;
}

import { procedureTriggerSchema } from "../../schemas/sources.schema";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type {
  ProjectedFileTypesCountAndLines,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../repositories/source/sources.model";
import type { TypeOf } from "zod";

// Define complexity levels as constant array for type safety
const COMPLEXITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];

/**
 * Type guard to check if a value is a valid Complexity value
 */
export function isComplexity(value: unknown): value is Complexity {
  return (
    typeof value === "string" &&
    (COMPLEXITY_LEVELS as readonly string[]).includes(value.toUpperCase())
  );
}

export type ProcedureTrigger = TypeOf<typeof procedureTriggerSchema>;

// Interface for the database interaction list
export interface ProcsAndTriggers {
  procs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: (ProcedureTrigger & { path: string; type: string; functionName: string })[];
  };
  trigs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: (ProcedureTrigger & { path: string; type: string; functionName: string })[];
  };
}

// Interface for app statistics data
export interface AppStatistics {
  projectName: string;
  currentDate: string;
  llmProvider: string;
  fileCount: number;
  linesOfCode: number;
  appDescription: string;
}

// Interface representing database integration information
export interface DatabaseIntegrationInfo {
  readonly path: string;
  readonly mechanism: string;
  readonly description: string;
  readonly codeExample: string;
}

/**
 * Unified data model for report generation.
 * Contains all the data needed to generate both HTML and JSON reports.
 */
export interface ReportData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[];
  dbInteractions: DatabaseIntegrationInfo[];
  procsAndTriggers: ProcsAndTriggers;
  topLevelJavaClasses: HierarchicalTopLevelJavaClassDependencies[];
}

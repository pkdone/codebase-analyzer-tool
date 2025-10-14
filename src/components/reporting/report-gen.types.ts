import { procedureTriggerSchema } from "../../schemas/sources.schema";
import type { AppSummaryNameDescArray } from "../../repositories/app-summary/app-summaries.model";
import type {
  ProjectedFileTypesCountAndLines,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../repositories/source/sources.model";
import type { TypeOf } from "zod";

// Define complexity levels as constant array for type safety
const COMPLEXITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
const COMPLEXITY_SET = new Set(COMPLEXITY_LEVELS);
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];

/**
 * Type guard to check if a value is a valid Complexity value
 */
export function isComplexity(value: unknown): value is Complexity {
  return typeof value === "string" && COMPLEXITY_SET.has(value.toUpperCase() as Complexity);
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
  readonly name?: string;
  readonly description: string;
  readonly databaseName?: string;
  readonly tablesAccessed?: string[];
  readonly operationType?: string[];
  readonly queryPatterns?: string;
  readonly transactionHandling?: string;
  readonly protocol?: string;
  readonly connectionInfo?: string;
  readonly codeExample: string;
}

// Interface representing integration point information (APIs, queues, topics, SOAP, etc.)
export interface IntegrationPointInfo {
  readonly namespace: string;
  readonly filepath: string;
  readonly mechanism: string;
  readonly name: string;
  readonly description: string;
  readonly path?: string;
  readonly method?: string;
  readonly queueOrTopicName?: string;
  readonly messageType?: string;
  readonly direction?: string;
  readonly requestBody?: string;
  readonly responseBody?: string;
  readonly authentication?: string;
  readonly protocol?: string;
  readonly connectionInfo?: string;
}

/**
 * Unified data model for report generation.
 * Contains all the data needed to generate both HTML and JSON reports.
 */
export interface ReportData {
  appStats: AppStatistics;
  fileTypesData: ProjectedFileTypesCountAndLines[];
  categorizedData: { category: string; label: string; data: AppSummaryNameDescArray }[];
  integrationPoints: IntegrationPointInfo[];
  dbInteractions: DatabaseIntegrationInfo[];
  procsAndTriggers: ProcsAndTriggers;
  topLevelJavaClasses: HierarchicalTopLevelJavaClassDependencies[];
}

import { procedureTriggerSchema } from "../../schemas/sources.schema";
import type { AppSummaryNameDescArray } from "../../repositories/app-summaries/app-summaries.model";
import type {
  ProjectedFileTypesCountAndLines,
  HierarchicalTopLevelJavaClassDependencies,
} from "../../repositories/sources/sources.model";
import type { TypeOf } from "zod";

// Define complexity levels as constant array for type safety
const COMPLEXITY_LEVELS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Complexity = (typeof COMPLEXITY_LEVELS)[number];

/**
 * Type guard to check if a value is a valid Complexity value
 */
export function isComplexityLevel(value: unknown): value is Complexity {
  return typeof value === "string" && COMPLEXITY_LEVELS.includes(value.toUpperCase() as Complexity);
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

// Interface for BOM dependency information
export interface BomDependency {
  readonly name: string;
  readonly groupId?: string;
  readonly versions: string[];
  readonly hasConflict: boolean;
  readonly scopes?: string[];
  readonly locations: string[];
}

// Interface for code quality summary information
export interface CodeQualitySummary {
  topComplexMethods: {
    methodName: string;
    filePath: string;
    complexity: number;
    linesOfCode: number;
    codeSmells?: string[];
  }[];
  commonCodeSmells: {
    smellType: string;
    occurrences: number;
    affectedFiles: number;
  }[];
  overallStatistics: {
    totalMethods: number;
    averageComplexity: number;
    highComplexityCount: number;
    veryHighComplexityCount: number;
    averageMethodLength: number;
    longMethodCount: number;
  };
}

// Interface for scheduled jobs summary information
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

// Interface for module coupling analysis information
export interface ModuleCoupling {
  couplings: {
    fromModule: string;
    toModule: string;
    referenceCount: number;
  }[];
  totalModules: number;
  totalCouplings: number;
  highestCouplingCount: number;
  moduleDepth: number;
}

// Interface for UI technology analysis information
export interface UiTechnologyAnalysis {
  frameworks: {
    name: string;
    version?: string;
    configFiles: string[];
  }[];
  totalJspFiles: number;
  totalScriptlets: number;
  totalExpressions: number;
  totalDeclarations: number;
  averageScriptletsPerFile: number;
  filesWithHighScriptletCount: number;
  customTagLibraries: {
    prefix: string;
    uri: string;
    usageCount: number;
  }[];
  topScriptletFiles: {
    filePath: string;
    scriptletCount: number;
    expressionCount: number;
    declarationCount: number;
    totalScriptletBlocks: number;
  }[];
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
  billOfMaterials: BomDependency[];
  codeQualitySummary: CodeQualitySummary | null;
  scheduledJobsSummary: ScheduledJobsSummary | null;
  moduleCoupling: ModuleCoupling | null;
  uiTechnologyAnalysis: UiTechnologyAnalysis | null;
}

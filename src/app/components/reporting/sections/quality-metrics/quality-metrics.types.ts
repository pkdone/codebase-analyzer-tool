// Interface for app statistics data
export interface AppStatistics {
  projectName: string;
  currentDate: string;
  llmProvider: string;
  fileCount: number;
  linesOfCode: number;
  appDescription: string;
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
  topComplexFunctions: {
    functionName: string;
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
    totalFunctions: number;
    averageComplexity: number;
    highComplexityCount: number;
    veryHighComplexityCount: number;
    averageFunctionLength: number;
    longFunctionCount: number;
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

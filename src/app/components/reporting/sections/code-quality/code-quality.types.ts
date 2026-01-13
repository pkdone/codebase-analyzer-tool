/**
 * Types for the code quality report section.
 */

/**
 * Interface for code quality summary information
 */
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

/**
 * Types for the code quality report section.
 */

/**
 * Complex function metrics from the database.
 */
export interface ComplexFunction {
  functionName: string;
  filePath: string;
  complexity: number;
  linesOfCode: number;
  codeSmells?: string[];
}

/**
 * Code smell statistics from the database.
 * Raw data type without presentation fields.
 */
export interface CodeSmellStatisticsData {
  smellType: string;
  occurrences: number;
  affectedFiles: number;
}

/**
 * Code smell statistics with presentation fields for HTML rendering.
 */
export interface CodeSmellStatistics extends CodeSmellStatisticsData {
  /** Pre-computed recommendation text for this smell type */
  recommendation: string;
}

/**
 * Overall code quality statistics from the database.
 */
export interface OverallStatistics {
  totalFunctions: number;
  averageComplexity: number;
  highComplexityCount: number;
  veryHighComplexityCount: number;
  averageFunctionLength: number;
  longFunctionCount: number;
}

/**
 * Raw code quality summary data without presentation fields.
 * Returned by the data provider, containing only domain data.
 */
export interface CodeQualitySummaryData {
  topComplexFunctions: ComplexFunction[];
  commonCodeSmells: CodeSmellStatisticsData[];
  overallStatistics: OverallStatistics;
}

/**
 * Code quality summary with presentation fields for HTML rendering.
 * Prepared by the section's prepareHtmlData() method.
 */
export interface CodeQualitySummary {
  topComplexFunctions: ComplexFunction[];
  commonCodeSmells: CodeSmellStatistics[];
  overallStatistics: OverallStatistics;
}

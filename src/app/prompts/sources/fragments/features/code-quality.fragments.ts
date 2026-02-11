/**
 * Code quality analysis instruction fragments.
 *
 * These fragments provide structured instructions for LLMs to analyze
 * code quality metrics including function-level and file-level measurements,
 * cyclomatic complexity, and code smell detection.
 */

/**
 * Code quality analysis instruction fragments.
 * Contains structured prompts for function metrics, code smells, and file-level quality analysis.
 */
export const CODE_QUALITY_FRAGMENTS = {
  INTRO: "Code Quality Analysis (REQUIRED for all code files and for all public functions/methods)",
  FUNCTION_METRICS: `For each public function/method you identify, you MUST estimate and provide:
  * cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, case, catch, &&, ||, ?:). A simple function with no branches = 1. Add 1 for each decision point.
  * linesOfCode: Count actual lines of code (exclude blank lines and comments)
  * codeSmells: Identify any of these common code smells present. Allowed labels:`,
  FUNCTION_SMELLS: `    - 'LONG METHOD' - function/method has > 50 lines of code
    - 'LONG PARAMETER LIST' - function/method has > 5 parameters
    - 'COMPLEX CONDITIONAL' - deeply nested if/else or complex boolean expressions
    - 'DUPLICATE CODE' - similar logic repeated in multiple places
    - 'MAGIC NUMBERS' - hardcoded numeric values without explanation
    - 'DEEP NESTING' - more than 3-4 levels of nesting
    - 'DEAD CODE' - unreachable or commented-out code
    - 'OTHER' - some other function/method-level smell`,
  FILE_METRICS: `For file-level codeQualityMetrics, provide:
  * totalFunctions: Count of all functions/methods in the file
  * averageComplexity: Average of all function/method complexities
  * maxComplexity: Highest complexity score in the file
  * averageFunctionLength: Average lines of code per function/method
  * fileSmells: File-level smells. Allowed labels:
    - 'GOD CLASS' - class has > 20 functions/methods or > 500 lines of code
    - 'TOO MANY METHODS' - class has > 20 public functions/methods
    - 'FEATURE ENVY' - functions/methods heavily use data from other classes
    - 'DATA CLASS' - class only contains fields and getters/setters
    - 'LARGE FILE' - class file exceeds 500 lines of code
    - 'OTHER' - some other file-level smell`,
} as const;

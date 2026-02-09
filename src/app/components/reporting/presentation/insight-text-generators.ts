/**
 * Text generation utilities for insight-related presentation.
 *
 * Generates human-readable descriptive text for code quality insights,
 * including code smell recommendations and scriptlet usage analysis messages.
 */

/**
 * Code smell recommendations mapping.
 * Maps smell type patterns to their recommended refactoring actions.
 */
const CODE_SMELL_RECOMMENDATIONS: readonly {
  readonly pattern: string;
  readonly recommendation: string;
}[] = [
  { pattern: "Long Method", recommendation: "Refactor into smaller, single-purpose methods" },
  {
    pattern: "God Class",
    recommendation: "Split into multiple classes following Single Responsibility Principle",
  },
  {
    pattern: "Duplicate Code",
    recommendation: "Extract common code into reusable functions or utilities",
  },
  { pattern: "Long Parameter List", recommendation: "Use parameter objects or builder pattern" },
  {
    pattern: "Complex Conditional",
    recommendation: "Simplify conditionals or extract into guard clauses",
  },
] as const;

/** Default recommendation when no specific pattern matches */
const DEFAULT_CODE_SMELL_RECOMMENDATION = "Review and refactor as part of modernization effort";

/**
 * Returns a recommendation for addressing a specific code smell type.
 * Maps smell type patterns to actionable refactoring suggestions.
 *
 * @param smellType - The type of code smell (e.g., "LONG METHOD", "God Class")
 * @returns Recommendation text for addressing the smell
 */
export function getCodeSmellRecommendation(smellType: string): string {
  const matchedRecommendation = CODE_SMELL_RECOMMENDATIONS.find((entry) =>
    smellType.toLowerCase().includes(entry.pattern.toLowerCase()),
  );

  return matchedRecommendation?.recommendation ?? DEFAULT_CODE_SMELL_RECOMMENDATION;
}

/** Thresholds for scriptlet usage insight levels */
const SCRIPTLET_USAGE_THRESHOLDS = {
  LOW: 5,
  MODERATE: 10,
} as const;

/**
 * Generates an insight message about scriptlet usage level.
 * Maps usage metrics to human-readable guidance for modernization.
 *
 * @param totalScriptlets - Total number of scriptlets in the project
 * @param averageScriptletsPerFile - Average number of scriptlets per JSP file
 * @returns Insight text describing the scriptlet usage level and recommendations
 */
export function getScriptletUsageInsight(
  totalScriptlets: number,
  averageScriptletsPerFile: number,
): string {
  if (totalScriptlets === 0) {
    return "No scriptlets detected - excellent! The codebase follows modern JSP best practices.";
  }

  const formattedAverage = averageScriptletsPerFile.toFixed(1);

  if (averageScriptletsPerFile < SCRIPTLET_USAGE_THRESHOLDS.LOW) {
    return `Low scriptlet usage (${formattedAverage} per file). Consider further refactoring to eliminate remaining scriptlets.`;
  }

  if (averageScriptletsPerFile < SCRIPTLET_USAGE_THRESHOLDS.MODERATE) {
    return `Moderate scriptlet usage (${formattedAverage} per file). Refactoring to tag libraries or modern UI framework recommended.`;
  }

  return `High scriptlet usage (${formattedAverage} per file). Significant refactoring needed for modernization.`;
}

import {
  getCouplingLevelPresentation,
  getDebtLevelPresentation,
  getTotalScriptletsCssClass,
  getFilesWithHighScriptletCountCssClass,
  shouldShowHighDebtAlert,
  getBomConflictsCssClass,
  getCodeSmellRecommendation,
  getScriptletUsageInsight,
  uiAnalysisConfig,
  type CouplingLevelPresentation,
  type DebtLevelPresentation,
} from "../../../../../src/app/components/reporting/presentation";
import { CouplingLevel } from "../../../../../src/app/components/reporting/sections/architecture-analysis/module-coupling.config";
import { DebtLevel } from "../../../../../src/app/components/reporting/sections/ui-analysis/ui-analysis.config";

// Extract constant from config for test readability
const HIGH_SCRIPTLET_WARNING_THRESHOLD = uiAnalysisConfig.HIGH_SCRIPTLET_WARNING_THRESHOLD;

describe("presentation-helpers", () => {
  describe("getCouplingLevelPresentation", () => {
    it("should return correct presentation for VERY_HIGH", () => {
      const result = getCouplingLevelPresentation(CouplingLevel.VERY_HIGH);
      expect(result).toEqual<CouplingLevelPresentation>({
        level: "Very High",
        cssClass: "badge-danger",
      });
    });

    it("should return correct presentation for HIGH", () => {
      const result = getCouplingLevelPresentation(CouplingLevel.HIGH);
      expect(result).toEqual<CouplingLevelPresentation>({
        level: "High",
        cssClass: "badge-high",
      });
    });

    it("should return correct presentation for MEDIUM", () => {
      const result = getCouplingLevelPresentation(CouplingLevel.MEDIUM);
      expect(result).toEqual<CouplingLevelPresentation>({
        level: "Medium",
        cssClass: "badge-warning",
      });
    });

    it("should return correct presentation for LOW", () => {
      const result = getCouplingLevelPresentation(CouplingLevel.LOW);
      expect(result).toEqual<CouplingLevelPresentation>({
        level: "Low",
        cssClass: "badge-success",
      });
    });
  });

  describe("getDebtLevelPresentation", () => {
    it("should return correct presentation for VERY_HIGH", () => {
      const result = getDebtLevelPresentation(DebtLevel.VERY_HIGH);
      expect(result).toEqual<DebtLevelPresentation>({
        level: "Very High",
        cssClass: "badge-danger",
      });
    });

    it("should return correct presentation for HIGH", () => {
      const result = getDebtLevelPresentation(DebtLevel.HIGH);
      expect(result).toEqual<DebtLevelPresentation>({
        level: "High",
        cssClass: "badge-warning",
      });
    });

    it("should return correct presentation for MODERATE", () => {
      const result = getDebtLevelPresentation(DebtLevel.MODERATE);
      expect(result).toEqual<DebtLevelPresentation>({
        level: "Moderate",
        cssClass: "badge-info",
      });
    });

    it("should return correct presentation for LOW", () => {
      const result = getDebtLevelPresentation(DebtLevel.LOW);
      expect(result).toEqual<DebtLevelPresentation>({
        level: "Low",
        cssClass: "badge-success",
      });
    });
  });

  describe("getTotalScriptletsCssClass", () => {
    it("should return warning class when scriptlets exceed threshold", () => {
      const result = getTotalScriptletsCssClass(HIGH_SCRIPTLET_WARNING_THRESHOLD + 1);
      expect(result).toBe("high-scriptlet-warning");
    });

    it("should return empty string when scriptlets equal threshold", () => {
      const result = getTotalScriptletsCssClass(HIGH_SCRIPTLET_WARNING_THRESHOLD);
      expect(result).toBe("");
    });

    it("should return empty string when scriptlets below threshold", () => {
      const result = getTotalScriptletsCssClass(50);
      expect(result).toBe("");
    });

    it("should return empty string for zero scriptlets", () => {
      const result = getTotalScriptletsCssClass(0);
      expect(result).toBe("");
    });

    it("should return warning class for very high scriptlet count", () => {
      const result = getTotalScriptletsCssClass(1000);
      expect(result).toBe("high-scriptlet-warning");
    });
  });

  describe("getFilesWithHighScriptletCountCssClass", () => {
    it("should return warning class when files with high scriptlet count > 0", () => {
      const result = getFilesWithHighScriptletCountCssClass(1);
      expect(result).toBe("warning-text");
    });

    it("should return empty string when no files with high scriptlet count", () => {
      const result = getFilesWithHighScriptletCountCssClass(0);
      expect(result).toBe("");
    });

    it("should return warning class for multiple high scriptlet files", () => {
      const result = getFilesWithHighScriptletCountCssClass(10);
      expect(result).toBe("warning-text");
    });
  });

  describe("shouldShowHighDebtAlert", () => {
    it("should return true when files with high scriptlet count > 0", () => {
      expect(shouldShowHighDebtAlert(1)).toBe(true);
    });

    it("should return false when no files with high scriptlet count", () => {
      expect(shouldShowHighDebtAlert(0)).toBe(false);
    });

    it("should return true for multiple high scriptlet files", () => {
      expect(shouldShowHighDebtAlert(5)).toBe(true);
    });
  });

  describe("getBomConflictsCssClass", () => {
    it("should return conflict-warning class when conflicts > 0", () => {
      const result = getBomConflictsCssClass(1);
      expect(result).toBe("conflict-warning");
    });

    it("should return no-conflicts class when no conflicts", () => {
      const result = getBomConflictsCssClass(0);
      expect(result).toBe("no-conflicts");
    });

    it("should return conflict-warning class for multiple conflicts", () => {
      const result = getBomConflictsCssClass(10);
      expect(result).toBe("conflict-warning");
    });
  });

  describe("getCodeSmellRecommendation", () => {
    it("should return recommendation for Long Method smell", () => {
      const result = getCodeSmellRecommendation("LONG METHOD");
      expect(result).toBe("Refactor into smaller, single-purpose methods");
    });

    it("should return recommendation for God Class smell (case insensitive)", () => {
      const result = getCodeSmellRecommendation("god class");
      expect(result).toBe("Split into multiple classes following Single Responsibility Principle");
    });

    it("should return recommendation for Duplicate Code smell", () => {
      const result = getCodeSmellRecommendation("Duplicate Code Found");
      expect(result).toBe("Extract common code into reusable functions or utilities");
    });

    it("should return recommendation for Long Parameter List smell", () => {
      const result = getCodeSmellRecommendation("Long Parameter List");
      expect(result).toBe("Use parameter objects or builder pattern");
    });

    it("should return recommendation for Complex Conditional smell", () => {
      const result = getCodeSmellRecommendation("Complex Conditional Logic");
      expect(result).toBe("Simplify conditionals or extract into guard clauses");
    });

    it("should return default recommendation for unknown smell type", () => {
      const result = getCodeSmellRecommendation("UNKNOWN_SMELL_TYPE");
      expect(result).toBe("Review and refactor as part of modernization effort");
    });

    it("should return default recommendation for empty smell type", () => {
      const result = getCodeSmellRecommendation("");
      expect(result).toBe("Review and refactor as part of modernization effort");
    });

    it("should match patterns that contain the smell type", () => {
      const result = getCodeSmellRecommendation("Very Long Method with excessive code");
      expect(result).toBe("Refactor into smaller, single-purpose methods");
    });
  });

  describe("getScriptletUsageInsight", () => {
    it("should return excellent message when no scriptlets", () => {
      const result = getScriptletUsageInsight(0, 0);
      expect(result).toBe(
        "No scriptlets detected - excellent! The codebase follows modern JSP best practices.",
      );
    });

    it("should return low usage message when average < 5", () => {
      const result = getScriptletUsageInsight(10, 2.5);
      expect(result).toBe(
        "Low scriptlet usage (2.5 per file). Consider further refactoring to eliminate remaining scriptlets.",
      );
    });

    it("should return moderate usage message when average >= 5 and < 10", () => {
      const result = getScriptletUsageInsight(50, 7.5);
      expect(result).toBe(
        "Moderate scriptlet usage (7.5 per file). Refactoring to tag libraries or modern UI framework recommended.",
      );
    });

    it("should return high usage message when average >= 10", () => {
      const result = getScriptletUsageInsight(200, 15.0);
      expect(result).toBe(
        "High scriptlet usage (15.0 per file). Significant refactoring needed for modernization.",
      );
    });

    it("should handle boundary at 5 scriptlets per file", () => {
      // At exactly 5.0, it should return moderate (not low)
      const result = getScriptletUsageInsight(50, 5.0);
      expect(result).toBe(
        "Moderate scriptlet usage (5.0 per file). Refactoring to tag libraries or modern UI framework recommended.",
      );
    });

    it("should handle boundary at 10 scriptlets per file", () => {
      // At exactly 10.0, it should return high (not moderate)
      const result = getScriptletUsageInsight(100, 10.0);
      expect(result).toBe(
        "High scriptlet usage (10.0 per file). Significant refactoring needed for modernization.",
      );
    });

    it("should format average to one decimal place", () => {
      const result = getScriptletUsageInsight(10, 3.333333);
      expect(result).toContain("3.3 per file");
    });
  });
});

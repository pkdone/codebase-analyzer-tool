import {
  getCouplingLevelPresentation,
  getDebtLevelPresentation,
  getTotalScriptletsCssClass,
  getFilesWithHighScriptletCountCssClass,
  shouldShowHighDebtAlert,
  getBomConflictsCssClass,
  uiAnalysisConfig,
  type CouplingLevelPresentation,
  type DebtLevelPresentation,
} from "../../../../../src/app/components/reporting/view-models/presentation-helpers";
import { CouplingLevel } from "../../../../../src/app/components/reporting/config/module-coupling.config";
import { DebtLevel } from "../../../../../src/app/components/reporting/config/ui-analysis.config";

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
});

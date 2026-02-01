/**
 * Tests for the consolidated presentation module exports.
 * Validates that all expected exports are available from the presentation module.
 */
import * as PresentationModule from "../../../../../src/app/components/reporting/presentation";

describe("presentation module barrel exports", () => {
  describe("presentation helpers", () => {
    it("should export getCouplingLevelPresentation", () => {
      expect(PresentationModule.getCouplingLevelPresentation).toBeDefined();
      expect(typeof PresentationModule.getCouplingLevelPresentation).toBe("function");
    });

    it("should export getDebtLevelPresentation", () => {
      expect(PresentationModule.getDebtLevelPresentation).toBeDefined();
      expect(typeof PresentationModule.getDebtLevelPresentation).toBe("function");
    });

    it("should export getTotalScriptletsCssClass", () => {
      expect(PresentationModule.getTotalScriptletsCssClass).toBeDefined();
      expect(typeof PresentationModule.getTotalScriptletsCssClass).toBe("function");
    });

    it("should export getBomConflictsCssClass", () => {
      expect(PresentationModule.getBomConflictsCssClass).toBeDefined();
      expect(typeof PresentationModule.getBomConflictsCssClass).toBe("function");
    });

    it("should export getCodeSmellRecommendation", () => {
      expect(PresentationModule.getCodeSmellRecommendation).toBeDefined();
      expect(typeof PresentationModule.getCodeSmellRecommendation).toBe("function");
    });

    it("should export getScriptletUsageInsight", () => {
      expect(PresentationModule.getScriptletUsageInsight).toBeDefined();
      expect(typeof PresentationModule.getScriptletUsageInsight).toBe("function");
    });

    it("should export uiAnalysisConfig", () => {
      expect(PresentationModule.uiAnalysisConfig).toBeDefined();
    });
  });

  describe("table presentation exports", () => {
    it("should export TableViewModel", () => {
      expect(PresentationModule.TableViewModel).toBeDefined();
      expect(typeof PresentationModule.TableViewModel).toBe("function");
    });

    it("should export formatRow", () => {
      expect(PresentationModule.formatRow).toBeDefined();
      expect(typeof PresentationModule.formatRow).toBe("function");
    });
  });
});

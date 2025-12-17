import { uiAnalysisConfig } from "../../../../../src/app/components/reporting/config/ui-analysis.config";

describe("uiAnalysisConfig", () => {
  describe("configuration values", () => {
    it("should have TOP_FILES_LIMIT defined", () => {
      expect(uiAnalysisConfig.TOP_FILES_LIMIT).toBeDefined();
      expect(uiAnalysisConfig.TOP_FILES_LIMIT).toBe(10);
    });

    it("should have HIGH_SCRIPTLET_THRESHOLD defined", () => {
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD).toBeDefined();
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD).toBe(10);
    });

    it("should have positive values", () => {
      expect(uiAnalysisConfig.TOP_FILES_LIMIT).toBeGreaterThan(0);
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD).toBeGreaterThan(0);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = uiAnalysisConfig;
      expect(config).toHaveProperty("TOP_FILES_LIMIT");
      expect(config).toHaveProperty("HIGH_SCRIPTLET_THRESHOLD");
    });
  });
});

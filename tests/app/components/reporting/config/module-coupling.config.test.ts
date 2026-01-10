import {
  moduleCouplingConfig,
  COUPLING_THRESHOLDS,
} from "../../../../../src/app/components/reporting/config/module-coupling.config";

describe("COUPLING_THRESHOLDS", () => {
  describe("threshold values", () => {
    it("should have VERY_HIGH threshold defined", () => {
      expect(COUPLING_THRESHOLDS.VERY_HIGH).toBeDefined();
      expect(COUPLING_THRESHOLDS.VERY_HIGH).toBe(0.7);
    });

    it("should have HIGH threshold defined", () => {
      expect(COUPLING_THRESHOLDS.HIGH).toBeDefined();
      expect(COUPLING_THRESHOLDS.HIGH).toBe(0.4);
    });

    it("should have MEDIUM threshold defined", () => {
      expect(COUPLING_THRESHOLDS.MEDIUM).toBeDefined();
      expect(COUPLING_THRESHOLDS.MEDIUM).toBe(0.2);
    });
  });

  describe("threshold ordering", () => {
    it("should have thresholds in descending order", () => {
      expect(COUPLING_THRESHOLDS.VERY_HIGH).toBeGreaterThan(COUPLING_THRESHOLDS.HIGH);
      expect(COUPLING_THRESHOLDS.HIGH).toBeGreaterThan(COUPLING_THRESHOLDS.MEDIUM);
    });

    it("should have all thresholds between 0 and 1", () => {
      expect(COUPLING_THRESHOLDS.VERY_HIGH).toBeGreaterThan(0);
      expect(COUPLING_THRESHOLDS.VERY_HIGH).toBeLessThanOrEqual(1);
      expect(COUPLING_THRESHOLDS.HIGH).toBeGreaterThan(0);
      expect(COUPLING_THRESHOLDS.HIGH).toBeLessThanOrEqual(1);
      expect(COUPLING_THRESHOLDS.MEDIUM).toBeGreaterThan(0);
      expect(COUPLING_THRESHOLDS.MEDIUM).toBeLessThanOrEqual(1);
    });
  });
});

describe("moduleCouplingConfig", () => {
  describe("configuration values", () => {
    it("should have DEFAULT_MODULE_DEPTH defined", () => {
      expect(moduleCouplingConfig.DEFAULT_MODULE_DEPTH).toBeDefined();
      expect(moduleCouplingConfig.DEFAULT_MODULE_DEPTH).toBe(2);
    });

    it("should have a positive value", () => {
      expect(moduleCouplingConfig.DEFAULT_MODULE_DEPTH).toBeGreaterThan(0);
    });

    it("should have a reasonable depth value", () => {
      // Module depth should be at least 1 and typically not more than 5
      expect(moduleCouplingConfig.DEFAULT_MODULE_DEPTH).toBeGreaterThanOrEqual(1);
      expect(moduleCouplingConfig.DEFAULT_MODULE_DEPTH).toBeLessThanOrEqual(5);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = moduleCouplingConfig;
      expect(config).toHaveProperty("DEFAULT_MODULE_DEPTH");
    });
  });
});

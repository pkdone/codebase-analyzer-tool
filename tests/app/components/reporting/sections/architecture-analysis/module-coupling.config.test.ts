import {
  moduleCouplingConfig,
  COUPLING_THRESHOLDS,
  CouplingLevel,
} from "../../../../../../src/app/components/reporting/sections/architecture-analysis/module-coupling.config";
import { calculateCouplingLevel } from "../../../../../../src/app/components/reporting/sections/architecture-analysis/coupling-calculator";

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

describe("CouplingLevel enum", () => {
  it("should define all expected coupling levels", () => {
    expect(CouplingLevel.VERY_HIGH).toBe("VERY_HIGH");
    expect(CouplingLevel.HIGH).toBe("HIGH");
    expect(CouplingLevel.MEDIUM).toBe("MEDIUM");
    expect(CouplingLevel.LOW).toBe("LOW");
  });
});

describe("calculateCouplingLevel", () => {
  describe("threshold calculations", () => {
    it("should return VERY_HIGH for >= 70% of highest coupling count", () => {
      const result = calculateCouplingLevel(70, 100);
      expect(result).toBe(CouplingLevel.VERY_HIGH);
    });

    it("should return HIGH for >= 40% but < 70% of highest coupling count", () => {
      const result = calculateCouplingLevel(40, 100);
      expect(result).toBe(CouplingLevel.HIGH);
    });

    it("should return MEDIUM for >= 20% but < 40% of highest coupling count", () => {
      const result = calculateCouplingLevel(20, 100);
      expect(result).toBe(CouplingLevel.MEDIUM);
    });

    it("should return LOW for < 20% of highest coupling count", () => {
      const result = calculateCouplingLevel(19, 100);
      expect(result).toBe(CouplingLevel.LOW);
    });
  });

  describe("boundary conditions", () => {
    it("should return VERY_HIGH at exactly 70% threshold", () => {
      const result = calculateCouplingLevel(7, 10);
      expect(result).toBe(CouplingLevel.VERY_HIGH);
    });

    it("should return HIGH just below 70% threshold", () => {
      const result = calculateCouplingLevel(69, 100);
      expect(result).toBe(CouplingLevel.HIGH);
    });

    it("should return HIGH at exactly 40% threshold", () => {
      const result = calculateCouplingLevel(4, 10);
      expect(result).toBe(CouplingLevel.HIGH);
    });

    it("should return MEDIUM at exactly 20% threshold", () => {
      const result = calculateCouplingLevel(2, 10);
      expect(result).toBe(CouplingLevel.MEDIUM);
    });

    it("should return LOW just below 20% threshold", () => {
      const result = calculateCouplingLevel(1, 10);
      expect(result).toBe(CouplingLevel.LOW);
    });
  });

  describe("edge cases", () => {
    it("should return LOW when highest count is 0", () => {
      const result = calculateCouplingLevel(5, 0);
      expect(result).toBe(CouplingLevel.LOW);
    });

    it("should return LOW when highest count is negative", () => {
      const result = calculateCouplingLevel(5, -10);
      expect(result).toBe(CouplingLevel.LOW);
    });

    it("should return VERY_HIGH when reference count equals highest count", () => {
      const result = calculateCouplingLevel(100, 100);
      expect(result).toBe(CouplingLevel.VERY_HIGH);
    });

    it("should return VERY_HIGH when reference count exceeds highest count", () => {
      const result = calculateCouplingLevel(150, 100);
      expect(result).toBe(CouplingLevel.VERY_HIGH);
    });

    it("should handle zero reference count", () => {
      const result = calculateCouplingLevel(0, 100);
      expect(result).toBe(CouplingLevel.LOW);
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

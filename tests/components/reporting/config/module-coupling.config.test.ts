import { moduleCouplingConfig } from "../../../../src/components/reporting/config/module-coupling.config";

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

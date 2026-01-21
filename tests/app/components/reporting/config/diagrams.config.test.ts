/**
 * Tests for consolidated diagram configuration.
 */

import {
  architectureConfig,
  currentArchitectureConfig,
  domainModelConfig,
  flowchartConfig,
} from "../../../../../src/app/components/reporting/diagrams/diagrams.config";

describe("Diagram Configurations", () => {
  describe("architectureConfig", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(architectureConfig.DEFAULT_WIDTH).toBe(1400);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(architectureConfig.DEFAULT_HEIGHT).toBe(500);
    });

    it("should have SERVICES_PER_ROW defined", () => {
      expect(architectureConfig.SERVICES_PER_ROW).toBe(3);
    });

    it("should have positive dimensions", () => {
      expect(architectureConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
      expect(architectureConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have positive SERVICES_PER_ROW", () => {
      expect(architectureConfig.SERVICES_PER_ROW).toBeGreaterThan(0);
    });
  });

  describe("currentArchitectureConfig", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(currentArchitectureConfig.DEFAULT_WIDTH).toBe(1600);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(currentArchitectureConfig.DEFAULT_HEIGHT).toBe(800);
    });

    it("should have mermaidInit configuration", () => {
      expect(currentArchitectureConfig.mermaidInit).toBeDefined();
    });

    it("should have DIAGRAM_PADDING defined in mermaidInit", () => {
      expect(currentArchitectureConfig.mermaidInit.DIAGRAM_PADDING).toBe(50);
    });

    it("should have NODE_SPACING defined in mermaidInit", () => {
      expect(currentArchitectureConfig.mermaidInit.NODE_SPACING).toBe(30);
    });

    it("should have RANK_SPACING defined in mermaidInit", () => {
      expect(currentArchitectureConfig.mermaidInit.RANK_SPACING).toBe(60);
    });

    it("should have positive dimensions", () => {
      expect(currentArchitectureConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
      expect(currentArchitectureConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have positive mermaid init values", () => {
      expect(currentArchitectureConfig.mermaidInit.DIAGRAM_PADDING).toBeGreaterThan(0);
      expect(currentArchitectureConfig.mermaidInit.NODE_SPACING).toBeGreaterThan(0);
      expect(currentArchitectureConfig.mermaidInit.RANK_SPACING).toBeGreaterThan(0);
    });
  });

  describe("domainModelConfig", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(domainModelConfig.DEFAULT_WIDTH).toBe(1200);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(domainModelConfig.DEFAULT_HEIGHT).toBe(600);
    });

    it("should have positive dimensions", () => {
      expect(domainModelConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
      expect(domainModelConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });
  });

  describe("flowchartConfig", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(flowchartConfig.DEFAULT_WIDTH).toBe(800);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(flowchartConfig.DEFAULT_HEIGHT).toBe(200);
    });

    it("should have positive dimensions", () => {
      expect(flowchartConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
      expect(flowchartConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });
  });

  describe("cross-config consistency", () => {
    it("should have all configs using consistent dimension property names", () => {
      expect(architectureConfig).toHaveProperty("DEFAULT_WIDTH");
      expect(architectureConfig).toHaveProperty("DEFAULT_HEIGHT");
      expect(currentArchitectureConfig).toHaveProperty("DEFAULT_WIDTH");
      expect(currentArchitectureConfig).toHaveProperty("DEFAULT_HEIGHT");
      expect(domainModelConfig).toHaveProperty("DEFAULT_WIDTH");
      expect(domainModelConfig).toHaveProperty("DEFAULT_HEIGHT");
      expect(flowchartConfig).toHaveProperty("DEFAULT_WIDTH");
      expect(flowchartConfig).toHaveProperty("DEFAULT_HEIGHT");
    });

    it("should have larger architecture diagrams than flowcharts", () => {
      expect(architectureConfig.DEFAULT_WIDTH).toBeGreaterThan(flowchartConfig.DEFAULT_WIDTH);
      expect(currentArchitectureConfig.DEFAULT_WIDTH).toBeGreaterThan(
        flowchartConfig.DEFAULT_WIDTH,
      );
    });
  });

  describe("immutability", () => {
    it("should have all configs as readonly objects", () => {
      expect(typeof architectureConfig).toBe("object");
      expect(typeof currentArchitectureConfig).toBe("object");
      expect(typeof domainModelConfig).toBe("object");
      expect(typeof flowchartConfig).toBe("object");
    });
  });
});

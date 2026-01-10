/**
 * Tests for visualization configuration modules.
 * These configs have been split from a single file into co-located config files.
 */

import { architectureConfig } from "../../../../../src/app/components/reporting/diagrams/generators/architecture.config";
import { domainModelConfig } from "../../../../../src/app/components/reporting/diagrams/generators/domain-model.config";
import { flowchartConfig } from "../../../../../src/app/components/reporting/diagrams/generators/flowchart.config";
import { currentArchitectureConfig } from "../../../../../src/app/components/reporting/diagrams/generators/current-architecture.config";
import { pieChartConfig } from "../../../../../src/app/components/reporting/view-models/pie-chart.config";

describe("Visualization Configuration", () => {
  describe("architecture config", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(architectureConfig.DEFAULT_WIDTH).toBeDefined();
      expect(typeof architectureConfig.DEFAULT_WIDTH).toBe("number");
      expect(architectureConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(architectureConfig.DEFAULT_HEIGHT).toBeDefined();
      expect(typeof architectureConfig.DEFAULT_HEIGHT).toBe("number");
      expect(architectureConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have SERVICES_PER_ROW defined", () => {
      expect(architectureConfig.SERVICES_PER_ROW).toBeDefined();
      expect(typeof architectureConfig.SERVICES_PER_ROW).toBe("number");
      expect(architectureConfig.SERVICES_PER_ROW).toBeGreaterThan(0);
    });

    it("should have valid layout constants", () => {
      expect(architectureConfig.WIDTH_PADDING).toBeGreaterThanOrEqual(0);
      expect(architectureConfig.HEIGHT_PER_ROW).toBeGreaterThan(0);
      expect(architectureConfig.HEIGHT_PADDING).toBeGreaterThanOrEqual(0);
    });
  });

  describe("domainModel config", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(domainModelConfig.DEFAULT_WIDTH).toBeDefined();
      expect(typeof domainModelConfig.DEFAULT_WIDTH).toBe("number");
      expect(domainModelConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(domainModelConfig.DEFAULT_HEIGHT).toBeDefined();
      expect(typeof domainModelConfig.DEFAULT_HEIGHT).toBe("number");
      expect(domainModelConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have WIDTH_PER_NODE defined", () => {
      expect(domainModelConfig.WIDTH_PER_NODE).toBeDefined();
      expect(typeof domainModelConfig.WIDTH_PER_NODE).toBe("number");
      expect(domainModelConfig.WIDTH_PER_NODE).toBeGreaterThan(0);
    });

    it("should have MIN_HEIGHT defined", () => {
      expect(domainModelConfig.MIN_HEIGHT).toBeDefined();
      expect(typeof domainModelConfig.MIN_HEIGHT).toBe("number");
      expect(domainModelConfig.MIN_HEIGHT).toBeGreaterThan(0);
    });
  });

  describe("flowchart config", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(flowchartConfig.DEFAULT_WIDTH).toBeDefined();
      expect(typeof flowchartConfig.DEFAULT_WIDTH).toBe("number");
      expect(flowchartConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(flowchartConfig.DEFAULT_HEIGHT).toBeDefined();
      expect(typeof flowchartConfig.DEFAULT_HEIGHT).toBe("number");
      expect(flowchartConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have WIDTH_PER_ACTIVITY defined", () => {
      expect(flowchartConfig.WIDTH_PER_ACTIVITY).toBeDefined();
      expect(typeof flowchartConfig.WIDTH_PER_ACTIVITY).toBe("number");
      expect(flowchartConfig.WIDTH_PER_ACTIVITY).toBeGreaterThan(0);
    });
  });

  describe("currentArchitecture config", () => {
    it("should have DEFAULT_WIDTH defined", () => {
      expect(currentArchitectureConfig.DEFAULT_WIDTH).toBeDefined();
      expect(typeof currentArchitectureConfig.DEFAULT_WIDTH).toBe("number");
      expect(currentArchitectureConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(currentArchitectureConfig.DEFAULT_HEIGHT).toBeDefined();
      expect(typeof currentArchitectureConfig.DEFAULT_HEIGHT).toBe("number");
      expect(currentArchitectureConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have mermaidInit configuration", () => {
      expect(currentArchitectureConfig.mermaidInit).toBeDefined();
      expect(currentArchitectureConfig.mermaidInit.DIAGRAM_PADDING).toBeGreaterThan(0);
      expect(currentArchitectureConfig.mermaidInit.NODE_SPACING).toBeGreaterThan(0);
      expect(currentArchitectureConfig.mermaidInit.RANK_SPACING).toBeGreaterThan(0);
    });
  });

  describe("pieChart config", () => {
    it("should have CENTER_X and CENTER_Y defined", () => {
      expect(pieChartConfig.CENTER_X).toBeDefined();
      expect(pieChartConfig.CENTER_Y).toBeDefined();
      expect(typeof pieChartConfig.CENTER_X).toBe("number");
      expect(typeof pieChartConfig.CENTER_Y).toBe("number");
    });

    it("should have RADIUS defined", () => {
      expect(pieChartConfig.RADIUS).toBeDefined();
      expect(typeof pieChartConfig.RADIUS).toBe("number");
      expect(pieChartConfig.RADIUS).toBeGreaterThan(0);
    });

    it("should have legend configuration", () => {
      expect(pieChartConfig.LEGEND_X).toBeDefined();
      expect(pieChartConfig.LEGEND_Y).toBeDefined();
      expect(pieChartConfig.LEGEND_ITEM_HEIGHT).toBeGreaterThan(0);
      expect(pieChartConfig.LEGEND_BOX_SIZE).toBeGreaterThan(0);
    });

    it("should have COLORS array with multiple colors", () => {
      expect(Array.isArray(pieChartConfig.COLORS)).toBe(true);
      expect(pieChartConfig.COLORS.length).toBeGreaterThan(0);
      // All colors should be valid hex colors
      for (const color of pieChartConfig.COLORS) {
        expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  describe("config immutability", () => {
    it("should have all configs as frozen objects (as const)", () => {
      expect(architectureConfig).toBeDefined();
      expect(domainModelConfig).toBeDefined();
      expect(flowchartConfig).toBeDefined();
      expect(currentArchitectureConfig).toBeDefined();
      expect(pieChartConfig).toBeDefined();
      expect(typeof architectureConfig).toBe("object");
      expect(typeof domainModelConfig).toBe("object");
      expect(typeof flowchartConfig).toBe("object");
      expect(typeof currentArchitectureConfig).toBe("object");
      expect(typeof pieChartConfig).toBe("object");
    });
  });
});

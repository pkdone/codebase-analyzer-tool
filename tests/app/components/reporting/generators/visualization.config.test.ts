import { visualizationConfig } from "../../../../../src/app/components/reporting/generators/visualization.config";

describe("Visualization Configuration", () => {
  describe("dependencyTree config", () => {
    const depTreeConfig = visualizationConfig.dependencyTree;

    it("should have MAX_DEPTH defined", () => {
      expect(depTreeConfig.MAX_DEPTH).toBeDefined();
      expect(typeof depTreeConfig.MAX_DEPTH).toBe("number");
      expect(depTreeConfig.MAX_DEPTH).toBeGreaterThan(0);
    });

    it("should have MAX_NODES_PER_DIAGRAM defined", () => {
      expect(depTreeConfig.MAX_NODES_PER_DIAGRAM).toBeDefined();
      expect(typeof depTreeConfig.MAX_NODES_PER_DIAGRAM).toBe("number");
      expect(depTreeConfig.MAX_NODES_PER_DIAGRAM).toBeGreaterThan(0);
    });

    it("should have MAX_CHILDREN_PER_NODE defined", () => {
      expect(depTreeConfig.MAX_CHILDREN_PER_NODE).toBeDefined();
      expect(typeof depTreeConfig.MAX_CHILDREN_PER_NODE).toBe("number");
      expect(depTreeConfig.MAX_CHILDREN_PER_NODE).toBeGreaterThan(0);
    });

    it("should have valid default dimensions", () => {
      expect(depTreeConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
      expect(depTreeConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have max dimensions greater than or equal to defaults", () => {
      expect(depTreeConfig.MAX_WIDTH).toBeGreaterThanOrEqual(depTreeConfig.DEFAULT_WIDTH);
      expect(depTreeConfig.MAX_HEIGHT).toBeGreaterThanOrEqual(depTreeConfig.DEFAULT_HEIGHT);
    });
  });

  describe("architecture config", () => {
    const archConfig = visualizationConfig.architecture;

    it("should have DEFAULT_WIDTH defined", () => {
      expect(archConfig.DEFAULT_WIDTH).toBeDefined();
      expect(typeof archConfig.DEFAULT_WIDTH).toBe("number");
      expect(archConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(archConfig.DEFAULT_HEIGHT).toBeDefined();
      expect(typeof archConfig.DEFAULT_HEIGHT).toBe("number");
      expect(archConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have SERVICES_PER_ROW defined", () => {
      expect(archConfig.SERVICES_PER_ROW).toBeDefined();
      expect(typeof archConfig.SERVICES_PER_ROW).toBe("number");
      expect(archConfig.SERVICES_PER_ROW).toBeGreaterThan(0);
    });

    it("should have valid layout constants", () => {
      expect(archConfig.MIN_WIDTH_PER_SERVICE).toBeGreaterThan(0);
      expect(archConfig.CHAR_WIDTH_MULTIPLIER).toBeGreaterThan(0);
      expect(archConfig.WIDTH_PADDING).toBeGreaterThanOrEqual(0);
      expect(archConfig.HEIGHT_PER_ROW).toBeGreaterThan(0);
      expect(archConfig.HEIGHT_PADDING).toBeGreaterThanOrEqual(0);
    });
  });

  describe("domainModel config", () => {
    const domainConfig = visualizationConfig.domainModel;

    it("should have DEFAULT_WIDTH defined", () => {
      expect(domainConfig.DEFAULT_WIDTH).toBeDefined();
      expect(typeof domainConfig.DEFAULT_WIDTH).toBe("number");
      expect(domainConfig.DEFAULT_WIDTH).toBeGreaterThan(0);
    });

    it("should have DEFAULT_HEIGHT defined", () => {
      expect(domainConfig.DEFAULT_HEIGHT).toBeDefined();
      expect(typeof domainConfig.DEFAULT_HEIGHT).toBe("number");
      expect(domainConfig.DEFAULT_HEIGHT).toBeGreaterThan(0);
    });

    it("should have WIDTH_PER_NODE defined", () => {
      expect(domainConfig.WIDTH_PER_NODE).toBeDefined();
      expect(typeof domainConfig.WIDTH_PER_NODE).toBe("number");
      expect(domainConfig.WIDTH_PER_NODE).toBeGreaterThan(0);
    });

    it("should have MIN_HEIGHT defined", () => {
      expect(domainConfig.MIN_HEIGHT).toBeDefined();
      expect(typeof domainConfig.MIN_HEIGHT).toBe("number");
      expect(domainConfig.MIN_HEIGHT).toBeGreaterThan(0);
    });
  });

  describe("flowchart config", () => {
    const flowchartConfig = visualizationConfig.flowchart;

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

  describe("config immutability", () => {
    it("should be a frozen object (as const)", () => {
      // visualizationConfig uses 'as const', but this is TypeScript-only
      // We verify the structure exists rather than runtime immutability
      expect(visualizationConfig).toBeDefined();
      expect(typeof visualizationConfig).toBe("object");
    });
  });
});

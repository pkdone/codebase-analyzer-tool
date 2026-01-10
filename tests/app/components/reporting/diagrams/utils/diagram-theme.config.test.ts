import { DIAGRAM_STYLES } from "../../../../../../src/app/components/reporting/diagrams/utils/diagram-theme.config";

describe("DIAGRAM_STYLES", () => {
  describe("configuration values", () => {
    it("should have backgroundColor defined", () => {
      expect(DIAGRAM_STYLES.backgroundColor).toBeDefined();
      expect(typeof DIAGRAM_STYLES.backgroundColor).toBe("string");
    });

    it("should have diagramPadding defined", () => {
      expect(DIAGRAM_STYLES.diagramPadding).toBeDefined();
      expect(typeof DIAGRAM_STYLES.diagramPadding).toBe("number");
      expect(DIAGRAM_STYLES.diagramPadding).toBeGreaterThan(0);
    });

    it("should have emptyDiagramFontFamily defined", () => {
      expect(DIAGRAM_STYLES.emptyDiagramFontFamily).toBeDefined();
      expect(typeof DIAGRAM_STYLES.emptyDiagramFontFamily).toBe("string");
    });

    it("should have emptyDiagramFontSize defined", () => {
      expect(DIAGRAM_STYLES.emptyDiagramFontSize).toBeDefined();
      expect(typeof DIAGRAM_STYLES.emptyDiagramFontSize).toBe("string");
    });

    it("should have emptyDiagramTextColor defined", () => {
      expect(DIAGRAM_STYLES.emptyDiagramTextColor).toBeDefined();
      expect(typeof DIAGRAM_STYLES.emptyDiagramTextColor).toBe("string");
    });
  });

  describe("color format", () => {
    it("should have valid hex color for backgroundColor", () => {
      expect(DIAGRAM_STYLES.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("should have valid hex color for emptyDiagramTextColor", () => {
      expect(DIAGRAM_STYLES.emptyDiagramTextColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  describe("expected values", () => {
    it("should have expected backgroundColor", () => {
      expect(DIAGRAM_STYLES.backgroundColor).toBe("#F0F3F2");
    });

    it("should have expected diagramPadding", () => {
      expect(DIAGRAM_STYLES.diagramPadding).toBe(30);
    });

    it("should have expected emptyDiagramFontFamily", () => {
      expect(DIAGRAM_STYLES.emptyDiagramFontFamily).toBe("system-ui, sans-serif");
    });

    it("should have expected emptyDiagramFontSize", () => {
      expect(DIAGRAM_STYLES.emptyDiagramFontSize).toBe("14");
    });

    it("should have expected emptyDiagramTextColor", () => {
      expect(DIAGRAM_STYLES.emptyDiagramTextColor).toBe("#8b95a1");
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = DIAGRAM_STYLES;
      expect(config).toHaveProperty("backgroundColor");
      expect(config).toHaveProperty("diagramPadding");
      expect(config).toHaveProperty("emptyDiagramFontFamily");
      expect(config).toHaveProperty("emptyDiagramFontSize");
      expect(config).toHaveProperty("emptyDiagramTextColor");
    });
  });
});

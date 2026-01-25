import {
  BRAND_COLORS,
  DIAGRAM_ELEMENT_COLORS,
  DIAGRAM_STYLES,
} from "../../../../../src/app/components/reporting/config/brand-theme.config";

describe("BRAND_COLORS", () => {
  describe("color values", () => {
    it("should have greenDark defined as MongoDB brand green", () => {
      expect(BRAND_COLORS.greenDark).toBe("#00684A");
    });

    it("should have greenLight defined as MongoDB accent green", () => {
      expect(BRAND_COLORS.greenLight).toBe("#00ED64");
    });

    it("should have black defined as MongoDB primary black", () => {
      expect(BRAND_COLORS.black).toBe("#001E2B");
    });

    it("should have greyDark1 defined", () => {
      expect(BRAND_COLORS.greyDark1).toBe("#3F3E42");
    });

    it("should have greyLight1 defined", () => {
      expect(BRAND_COLORS.greyLight1).toBe("#C1C7C6");
    });

    it("should have greyLight2 defined", () => {
      expect(BRAND_COLORS.greyLight2).toBe("#E8EDEB");
    });

    it("should have white defined", () => {
      expect(BRAND_COLORS.white).toBe("#FFFFFF");
    });
  });

  describe("color format validation", () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

    it("should have valid hex format for all brand colors", () => {
      Object.values(BRAND_COLORS).forEach((value) => {
        expect(value).toMatch(hexColorRegex);
      });
    });
  });

  describe("immutability", () => {
    it("should be a readonly object with all expected keys", () => {
      expect(BRAND_COLORS).toHaveProperty("greenDark");
      expect(BRAND_COLORS).toHaveProperty("greenLight");
      expect(BRAND_COLORS).toHaveProperty("black");
      expect(BRAND_COLORS).toHaveProperty("greyDark1");
      expect(BRAND_COLORS).toHaveProperty("greyLight1");
      expect(BRAND_COLORS).toHaveProperty("greyLight2");
      expect(BRAND_COLORS).toHaveProperty("white");
    });
  });
});

describe("DIAGRAM_ELEMENT_COLORS", () => {
  describe("color values", () => {
    it("should have boundedContextFill defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.boundedContextFill).toBe("#e8f5e8");
    });

    it("should have aggregateFill defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.aggregateFill).toBe("#e3f2fd");
    });

    it("should have aggregateStroke defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.aggregateStroke).toBe("#1976d2");
    });

    it("should have entityFill defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.entityFill).toBe("#f3e5f5");
    });

    it("should have entityStroke defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.entityStroke).toBe("#7b1fa2");
    });

    it("should have repositoryFill defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.repositoryFill).toBe("#fff5f0");
    });

    it("should have repositoryStroke defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.repositoryStroke).toBe("#d2691e");
    });

    it("should have externalComponentFill defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.externalComponentFill).toBe("#fff3e0");
    });

    it("should have externalComponentStroke defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.externalComponentStroke).toBe("#e65100");
    });

    it("should have dependencyFill defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.dependencyFill).toBe("#f8f9fa");
    });

    it("should have dependencyStroke defined", () => {
      expect(DIAGRAM_ELEMENT_COLORS.dependencyStroke).toBe("#6c757d");
    });
  });

  describe("color format validation", () => {
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;

    it("should have valid hex format for all diagram element colors", () => {
      Object.values(DIAGRAM_ELEMENT_COLORS).forEach((value) => {
        expect(value).toMatch(hexColorRegex);
      });
    });
  });

  describe("immutability", () => {
    it("should be a readonly object with all expected keys", () => {
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("boundedContextFill");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("aggregateFill");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("aggregateStroke");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("entityFill");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("entityStroke");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("repositoryFill");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("repositoryStroke");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("externalComponentFill");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("externalComponentStroke");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("dependencyFill");
      expect(DIAGRAM_ELEMENT_COLORS).toHaveProperty("dependencyStroke");
    });
  });
});

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

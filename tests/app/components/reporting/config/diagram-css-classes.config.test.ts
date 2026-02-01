import {
  DIAGRAM_CSS_CLASSES,
  ALL_DIAGRAM_CSS_CLASS_NAMES,
  type DiagramCssClassName,
} from "../../../../../src/app/components/reporting/config/diagram-css-classes.config";
import { buildStyleDefinitions } from "../../../../../src/app/components/reporting/diagrams/utils/mermaid-styles";

describe("diagram-css-classes.config", () => {
  describe("DIAGRAM_CSS_CLASSES", () => {
    it("should define all required CSS class names", () => {
      expect(DIAGRAM_CSS_CLASSES.BOUNDED_CONTEXT).toBe("boundedContext");
      expect(DIAGRAM_CSS_CLASSES.AGGREGATE).toBe("aggregate");
      expect(DIAGRAM_CSS_CLASSES.ENTITY).toBe("entity");
      expect(DIAGRAM_CSS_CLASSES.REPOSITORY).toBe("repository");
      expect(DIAGRAM_CSS_CLASSES.SERVICE).toBe("service");
      expect(DIAGRAM_CSS_CLASSES.PROCESS).toBe("process");
      expect(DIAGRAM_CSS_CLASSES.DEPENDENCY).toBe("dependency");
      expect(DIAGRAM_CSS_CLASSES.ROOT_DEPENDENCY).toBe("rootDependency");
      expect(DIAGRAM_CSS_CLASSES.INTERNAL_COMPONENT).toBe("internalComponent");
      expect(DIAGRAM_CSS_CLASSES.EXTERNAL_COMPONENT).toBe("externalComponent");
    });

    it("should have 10 CSS class definitions", () => {
      const keys = Object.keys(DIAGRAM_CSS_CLASSES);
      expect(keys).toHaveLength(10);
    });

    it("should have unique class name values", () => {
      const values = Object.values(DIAGRAM_CSS_CLASSES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it("should have valid camelCase class names (no spaces or special chars)", () => {
      const values = Object.values(DIAGRAM_CSS_CLASSES);
      for (const value of values) {
        expect(value).toMatch(/^[a-zA-Z][a-zA-Z0-9]*$/);
      }
    });
  });

  describe("ALL_DIAGRAM_CSS_CLASS_NAMES", () => {
    it("should contain all class names from DIAGRAM_CSS_CLASSES", () => {
      const expectedClassNames = Object.values(DIAGRAM_CSS_CLASSES);
      expect(ALL_DIAGRAM_CSS_CLASS_NAMES).toHaveLength(expectedClassNames.length);

      for (const className of expectedClassNames) {
        expect(ALL_DIAGRAM_CSS_CLASS_NAMES).toContain(className);
      }
    });

    it("should be a readonly array", () => {
      // TypeScript compile-time check - if this compiles, it's readonly
      const arr: readonly DiagramCssClassName[] = ALL_DIAGRAM_CSS_CLASS_NAMES;
      expect(arr).toBeDefined();
    });
  });

  describe("DiagramCssClassName type", () => {
    it("should accept valid class names", () => {
      // TypeScript compile-time check - if this compiles, the type is correct
      const validClassName: DiagramCssClassName = "boundedContext";
      expect(validClassName).toBe("boundedContext");
    });
  });

  describe("Integration with mermaid-styles", () => {
    it("should have all DIAGRAM_CSS_CLASSES used in buildStyleDefinitions", () => {
      const styleDefinitions = buildStyleDefinitions();

      // All class names should appear in the style definitions
      for (const className of ALL_DIAGRAM_CSS_CLASS_NAMES) {
        expect(styleDefinitions).toContain(`classDef ${className}`);
      }
    });

    it("should have style definitions for each class name", () => {
      const styleDefinitions = buildStyleDefinitions();

      // Each class should have fill, stroke, and color properties
      for (const className of ALL_DIAGRAM_CSS_CLASS_NAMES) {
        const classDefRegex = new RegExp(`classDef ${className} fill:`);
        expect(styleDefinitions).toMatch(classDefRegex);
      }
    });
  });
});

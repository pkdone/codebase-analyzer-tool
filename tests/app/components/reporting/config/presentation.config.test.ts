/**
 * Tests for presentation configuration constants.
 */

import {
  LEVEL_LABELS,
  BADGE_CLASSES,
  WARNING_CLASSES,
} from "../../../../../src/app/components/reporting/config/presentation.config";

describe("Presentation Configuration", () => {
  describe("LEVEL_LABELS", () => {
    it("should have VERY_HIGH defined", () => {
      expect(LEVEL_LABELS.VERY_HIGH).toBe("Very High");
    });

    it("should have HIGH defined", () => {
      expect(LEVEL_LABELS.HIGH).toBe("High");
    });

    it("should have MEDIUM defined", () => {
      expect(LEVEL_LABELS.MEDIUM).toBe("Medium");
    });

    it("should have MODERATE defined", () => {
      expect(LEVEL_LABELS.MODERATE).toBe("Moderate");
    });

    it("should have LOW defined", () => {
      expect(LEVEL_LABELS.LOW).toBe("Low");
    });

    it("should have all labels as non-empty strings", () => {
      Object.values(LEVEL_LABELS).forEach((label) => {
        expect(typeof label).toBe("string");
        expect(label.length).toBeGreaterThan(0);
      });
    });

    it("should have unique labels", () => {
      const labels = Object.values(LEVEL_LABELS);
      const uniqueLabels = new Set(labels);
      expect(uniqueLabels.size).toBe(labels.length);
    });
  });

  describe("BADGE_CLASSES", () => {
    it("should have DANGER defined", () => {
      expect(BADGE_CLASSES.DANGER).toBe("badge-danger");
    });

    it("should have HIGH defined", () => {
      expect(BADGE_CLASSES.HIGH).toBe("badge-high");
    });

    it("should have WARNING defined", () => {
      expect(BADGE_CLASSES.WARNING).toBe("badge-warning");
    });

    it("should have INFO defined", () => {
      expect(BADGE_CLASSES.INFO).toBe("badge-info");
    });

    it("should have SUCCESS defined", () => {
      expect(BADGE_CLASSES.SUCCESS).toBe("badge-success");
    });

    it("should have SECONDARY defined", () => {
      expect(BADGE_CLASSES.SECONDARY).toBe("badge-secondary");
    });

    it("should have all classes starting with 'badge-'", () => {
      Object.values(BADGE_CLASSES).forEach((cls) => {
        expect(cls).toMatch(/^badge-/);
      });
    });

    it("should have unique class names", () => {
      const classes = Object.values(BADGE_CLASSES);
      const uniqueClasses = new Set(classes);
      expect(uniqueClasses.size).toBe(classes.length);
    });

    it("should have valid CSS class name format", () => {
      Object.values(BADGE_CLASSES).forEach((cls) => {
        // CSS class names should be alphanumeric with hyphens
        expect(cls).toMatch(/^[a-z][a-z0-9-]*$/);
      });
    });
  });

  describe("WARNING_CLASSES", () => {
    it("should have HIGH_SCRIPTLET defined", () => {
      expect(WARNING_CLASSES.HIGH_SCRIPTLET).toBe("high-scriptlet-warning");
    });

    it("should have WARNING_TEXT defined", () => {
      expect(WARNING_CLASSES.WARNING_TEXT).toBe("warning-text");
    });

    it("should have CONFLICT defined", () => {
      expect(WARNING_CLASSES.CONFLICT).toBe("conflict-warning");
    });

    it("should have NO_CONFLICTS defined", () => {
      expect(WARNING_CLASSES.NO_CONFLICTS).toBe("no-conflicts");
    });

    it("should have unique class names", () => {
      const classes = Object.values(WARNING_CLASSES);
      const uniqueClasses = new Set(classes);
      expect(uniqueClasses.size).toBe(classes.length);
    });

    it("should have valid CSS class name format", () => {
      Object.values(WARNING_CLASSES).forEach((cls) => {
        // CSS class names should be alphanumeric with hyphens
        expect(cls).toMatch(/^[a-z][a-z0-9-]*$/);
      });
    });
  });

  describe("immutability", () => {
    it("should have all configs as readonly objects", () => {
      expect(typeof LEVEL_LABELS).toBe("object");
      expect(typeof BADGE_CLASSES).toBe("object");
      expect(typeof WARNING_CLASSES).toBe("object");
    });
  });
});

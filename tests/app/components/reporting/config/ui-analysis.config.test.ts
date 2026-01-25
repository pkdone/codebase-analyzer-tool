import {
  uiAnalysisConfig,
  TAG_LIBRARY_PATTERNS,
  TAG_LIBRARY_BADGE_CLASSES,
  classifyTagLibrary,
  DEBT_THRESHOLDS,
  DebtLevel,
  calculateDebtLevel,
} from "../../../../../src/app/components/reporting/config/ui-analysis.config";
import { BADGE_CLASSES } from "../../../../../src/app/components/reporting/config/presentation.config";

describe("DebtLevel enum", () => {
  it("should define all expected debt levels", () => {
    expect(DebtLevel.VERY_HIGH).toBe("VERY_HIGH");
    expect(DebtLevel.HIGH).toBe("HIGH");
    expect(DebtLevel.MODERATE).toBe("MODERATE");
    expect(DebtLevel.LOW).toBe("LOW");
  });
});

describe("DEBT_THRESHOLDS", () => {
  describe("threshold values", () => {
    it("should have VERY_HIGH threshold defined", () => {
      expect(DEBT_THRESHOLDS.VERY_HIGH).toBeDefined();
      expect(DEBT_THRESHOLDS.VERY_HIGH).toBe(20);
    });

    it("should have HIGH threshold defined", () => {
      expect(DEBT_THRESHOLDS.HIGH).toBeDefined();
      expect(DEBT_THRESHOLDS.HIGH).toBe(10);
    });

    it("should have MODERATE threshold defined", () => {
      expect(DEBT_THRESHOLDS.MODERATE).toBeDefined();
      expect(DEBT_THRESHOLDS.MODERATE).toBe(5);
    });
  });

  describe("threshold ordering", () => {
    it("should have thresholds in descending order", () => {
      expect(DEBT_THRESHOLDS.VERY_HIGH).toBeGreaterThan(DEBT_THRESHOLDS.HIGH);
      expect(DEBT_THRESHOLDS.HIGH).toBeGreaterThan(DEBT_THRESHOLDS.MODERATE);
    });

    it("should have all thresholds as positive integers", () => {
      expect(DEBT_THRESHOLDS.VERY_HIGH).toBeGreaterThan(0);
      expect(Number.isInteger(DEBT_THRESHOLDS.VERY_HIGH)).toBe(true);
      expect(DEBT_THRESHOLDS.HIGH).toBeGreaterThan(0);
      expect(Number.isInteger(DEBT_THRESHOLDS.HIGH)).toBe(true);
      expect(DEBT_THRESHOLDS.MODERATE).toBeGreaterThan(0);
      expect(Number.isInteger(DEBT_THRESHOLDS.MODERATE)).toBe(true);
    });
  });
});

describe("calculateDebtLevel", () => {
  describe("threshold calculations", () => {
    it("should return VERY_HIGH for > 20 total blocks", () => {
      const result = calculateDebtLevel(21);
      expect(result).toBe(DebtLevel.VERY_HIGH);
    });

    it("should return HIGH for > 10 but <= 20 total blocks", () => {
      const result = calculateDebtLevel(15);
      expect(result).toBe(DebtLevel.HIGH);
    });

    it("should return MODERATE for > 5 but <= 10 total blocks", () => {
      const result = calculateDebtLevel(8);
      expect(result).toBe(DebtLevel.MODERATE);
    });

    it("should return LOW for <= 5 total blocks", () => {
      const result = calculateDebtLevel(5);
      expect(result).toBe(DebtLevel.LOW);
    });
  });

  describe("boundary conditions", () => {
    it("should return HIGH at exactly 20 total blocks", () => {
      const result = calculateDebtLevel(20);
      expect(result).toBe(DebtLevel.HIGH);
    });

    it("should return VERY_HIGH at 21 total blocks", () => {
      const result = calculateDebtLevel(21);
      expect(result).toBe(DebtLevel.VERY_HIGH);
    });

    it("should return MODERATE at exactly 10 total blocks", () => {
      const result = calculateDebtLevel(10);
      expect(result).toBe(DebtLevel.MODERATE);
    });

    it("should return HIGH at 11 total blocks", () => {
      const result = calculateDebtLevel(11);
      expect(result).toBe(DebtLevel.HIGH);
    });

    it("should return LOW at exactly 5 total blocks", () => {
      const result = calculateDebtLevel(5);
      expect(result).toBe(DebtLevel.LOW);
    });

    it("should return MODERATE at 6 total blocks", () => {
      const result = calculateDebtLevel(6);
      expect(result).toBe(DebtLevel.MODERATE);
    });
  });

  describe("edge cases", () => {
    it("should return LOW for 0 total blocks", () => {
      const result = calculateDebtLevel(0);
      expect(result).toBe(DebtLevel.LOW);
    });

    it("should return LOW for negative total blocks", () => {
      // Shouldn't happen in practice but should handle gracefully
      const result = calculateDebtLevel(-5);
      expect(result).toBe(DebtLevel.LOW);
    });

    it("should return VERY_HIGH for very large total blocks", () => {
      const result = calculateDebtLevel(1000);
      expect(result).toBe(DebtLevel.VERY_HIGH);
    });
  });
});

describe("uiAnalysisConfig", () => {
  describe("configuration values", () => {
    it("should have TOP_FILES_LIMIT defined", () => {
      expect(uiAnalysisConfig.TOP_FILES_LIMIT).toBeDefined();
      expect(uiAnalysisConfig.TOP_FILES_LIMIT).toBe(10);
    });

    it("should have HIGH_SCRIPTLET_THRESHOLD defined", () => {
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD).toBeDefined();
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD).toBe(10);
    });

    it("should have HIGH_SCRIPTLET_WARNING_THRESHOLD defined", () => {
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_WARNING_THRESHOLD).toBeDefined();
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_WARNING_THRESHOLD).toBe(100);
    });

    it("should have positive values", () => {
      expect(uiAnalysisConfig.TOP_FILES_LIMIT).toBeGreaterThan(0);
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD).toBeGreaterThan(0);
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_WARNING_THRESHOLD).toBeGreaterThan(0);
    });

    it("should have HIGH_SCRIPTLET_WARNING_THRESHOLD greater than HIGH_SCRIPTLET_THRESHOLD", () => {
      expect(uiAnalysisConfig.HIGH_SCRIPTLET_WARNING_THRESHOLD).toBeGreaterThan(
        uiAnalysisConfig.HIGH_SCRIPTLET_THRESHOLD,
      );
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = uiAnalysisConfig;
      expect(config).toHaveProperty("TOP_FILES_LIMIT");
      expect(config).toHaveProperty("HIGH_SCRIPTLET_THRESHOLD");
      expect(config).toHaveProperty("HIGH_SCRIPTLET_WARNING_THRESHOLD");
    });
  });
});

describe("TAG_LIBRARY_PATTERNS", () => {
  it("should have JSTL pattern defined", () => {
    expect(TAG_LIBRARY_PATTERNS.JSTL).toBe("java.sun.com/jsp/jstl");
  });

  it("should have SPRING pattern defined", () => {
    expect(TAG_LIBRARY_PATTERNS.SPRING).toBe("springframework.org");
  });

  it("should have custom tag library indicators defined", () => {
    expect(TAG_LIBRARY_PATTERNS.CUSTOM_WEB_INF).toBe("/WEB-INF/");
    expect(TAG_LIBRARY_PATTERNS.CUSTOM_KEYWORD).toBe("custom");
  });
});

describe("TAG_LIBRARY_BADGE_CLASSES", () => {
  describe("class mappings use centralized BADGE_CLASSES", () => {
    it("should use BADGE_CLASSES.INFO for JSTL", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.JSTL).toBe(BADGE_CLASSES.INFO);
    });

    it("should use BADGE_CLASSES.INFO for Spring", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.Spring).toBe(BADGE_CLASSES.INFO);
    });

    it("should use BADGE_CLASSES.WARNING for Custom", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.Custom).toBe(BADGE_CLASSES.WARNING);
    });

    it("should use BADGE_CLASSES.SECONDARY for Other", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.Other).toBe(BADGE_CLASSES.SECONDARY);
    });
  });

  describe("class values match expected CSS classes", () => {
    it("should have CSS class for JSTL", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.JSTL).toBe("badge-info");
    });

    it("should have CSS class for Spring", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.Spring).toBe("badge-info");
    });

    it("should have CSS class for Custom", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.Custom).toBe("badge-warning");
    });

    it("should have CSS class for Other", () => {
      expect(TAG_LIBRARY_BADGE_CLASSES.Other).toBe("badge-secondary");
    });
  });
});

describe("classifyTagLibrary", () => {
  describe("JSTL classification", () => {
    it("should classify JSTL core URI as JSTL", () => {
      expect(classifyTagLibrary("http://java.sun.com/jsp/jstl/core")).toBe("JSTL");
    });

    it("should classify JSTL fmt URI as JSTL", () => {
      expect(classifyTagLibrary("http://java.sun.com/jsp/jstl/fmt")).toBe("JSTL");
    });

    it("should classify JSTL functions URI as JSTL", () => {
      expect(classifyTagLibrary("http://java.sun.com/jsp/jstl/functions")).toBe("JSTL");
    });
  });

  describe("Spring classification", () => {
    it("should classify Spring tags URI as Spring", () => {
      expect(classifyTagLibrary("http://www.springframework.org/tags")).toBe("Spring");
    });

    it("should classify Spring form URI as Spring", () => {
      expect(classifyTagLibrary("http://www.springframework.org/tags/form")).toBe("Spring");
    });
  });

  describe("Custom classification", () => {
    it("should classify WEB-INF URIs as Custom", () => {
      expect(classifyTagLibrary("/WEB-INF/tlds/mytags.tld")).toBe("Custom");
    });

    it("should classify URIs containing 'custom' as Custom", () => {
      expect(classifyTagLibrary("http://mycompany.com/custom/tags")).toBe("Custom");
    });
  });

  describe("Other classification", () => {
    it("should classify unrecognized URIs as Other", () => {
      expect(classifyTagLibrary("http://mycompany.com/tags")).toBe("Other");
    });

    it("should classify empty string as Other", () => {
      expect(classifyTagLibrary("")).toBe("Other");
    });

    it("should classify Struts URIs as Other", () => {
      expect(classifyTagLibrary("http://struts.apache.org/tags-html")).toBe("Other");
    });
  });
});

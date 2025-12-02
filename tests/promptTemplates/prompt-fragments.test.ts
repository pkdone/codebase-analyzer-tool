import {
  SOURCES_PROMPT_FRAGMENTS,
  COMPOSITES,
} from "../../src/prompts/definitions/sources/sources.fragments";

describe("prompt-fragments", () => {
  describe("PROMPT_FRAGMENTS.COMMON", () => {
    it("should have PURPOSE and IMPLEMENTATION fragments", () => {
      expect(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION).toBeDefined();
      expect(typeof SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE).toBe("string");
      expect(typeof SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION).toBe("string");
    });

    it("should have all common fragments consolidated in COMMON section", () => {
      expect(SOURCES_PROMPT_FRAGMENTS.COMMON).toHaveProperty("PURPOSE");
      expect(SOURCES_PROMPT_FRAGMENTS.COMMON).toHaveProperty("IMPLEMENTATION");
      expect(SOURCES_PROMPT_FRAGMENTS.COMMON).toHaveProperty("DB_IN_DOCUMENTATION");
      expect(SOURCES_PROMPT_FRAGMENTS.COMMON).toHaveProperty("DB_IN_FILE");
    });
  });

  describe("COMPOSITES.CODE_QUALITY", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(COMPOSITES.CODE_QUALITY)).toBe(true);
      expect(COMPOSITES.CODE_QUALITY.length).toBeGreaterThan(0);
      COMPOSITES.CODE_QUALITY.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include code quality fragments", () => {
      const joined = COMPOSITES.CODE_QUALITY.join(" ");
      expect(joined).toContain("Code Quality Analysis");
      expect(joined).toContain("cyclomaticComplexity");
    });
  });

  describe("COMPOSITES.DB_INTEGRATION", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(COMPOSITES.DB_INTEGRATION)).toBe(true);
      expect(COMPOSITES.DB_INTEGRATION.length).toBeGreaterThan(0);
      COMPOSITES.DB_INTEGRATION.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include database integration fragments", () => {
      const joined = COMPOSITES.DB_INTEGRATION.join(" ");
      expect(joined).toContain("Database Integration Analysis");
      expect(joined).toContain("mechanism");
    });
  });

  describe("COMPOSITES.INTEGRATION_POINTS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(COMPOSITES.INTEGRATION_POINTS)).toBe(true);
      expect(COMPOSITES.INTEGRATION_POINTS.length).toBeGreaterThan(0);
      COMPOSITES.INTEGRATION_POINTS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include integration points fragment", () => {
      const joined = COMPOSITES.INTEGRATION_POINTS.join(" ");
      expect(joined).toContain("integration points");
    });
  });

  describe("COMPOSITES.SCHEDULED_JOBS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(COMPOSITES.SCHEDULED_JOBS)).toBe(true);
      expect(COMPOSITES.SCHEDULED_JOBS.length).toBeGreaterThan(0);
      COMPOSITES.SCHEDULED_JOBS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include scheduled jobs fragments", () => {
      const joined = COMPOSITES.SCHEDULED_JOBS.join(" ");
      expect(joined).toContain("scheduled jobs");
    });
  });

  describe("SOURCES_PROMPT_FRAGMENTS.BASE.CLASS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(SOURCES_PROMPT_FRAGMENTS.BASE.CLASS)).toBe(true);
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.CLASS.length).toBeGreaterThan(0);
      SOURCES_PROMPT_FRAGMENTS.BASE.CLASS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include base instructions for class-based languages", () => {
      const joined = SOURCES_PROMPT_FRAGMENTS.BASE.CLASS.join(" ");
      expect(joined).toContain("class");
      expect(joined).toContain("namespace");
      expect(joined).toContain("interface");
    });
  });

  describe("SOURCES_PROMPT_FRAGMENTS.BASE.MODULE", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(SOURCES_PROMPT_FRAGMENTS.BASE.MODULE)).toBe(true);
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.MODULE.length).toBeGreaterThan(0);
      SOURCES_PROMPT_FRAGMENTS.BASE.MODULE.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include base instructions for module-based languages", () => {
      const joined = SOURCES_PROMPT_FRAGMENTS.BASE.MODULE.join(" ");
      expect(joined).toContain("entity");
      expect(joined).toContain("module");
      expect(joined).toContain("namespace");
    });
  });

  describe("Composing instructions", () => {
    it("should allow spreading instruction sets", () => {
      const composed = [
        ...COMPOSITES.INTEGRATION_POINTS,
        ...COMPOSITES.DB_INTEGRATION,
        ...COMPOSITES.CODE_QUALITY,
      ];

      expect(composed.length).toBeGreaterThan(0);
      expect(Array.isArray(composed)).toBe(true);
      composed.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should allow combining instruction sets with custom instructions", () => {
      const customInstructions = ["Custom instruction 1", "Custom instruction 2"];
      const composed = [...COMPOSITES.INTEGRATION_POINTS, ...customInstructions];

      expect(composed.length).toBeGreaterThan(customInstructions.length);
      expect(composed).toContain("Custom instruction 1");
      expect(composed).toContain("Custom instruction 2");
    });

    it("should allow combining base language instructions with code quality instructions", () => {
      const composed = [...SOURCES_PROMPT_FRAGMENTS.BASE.CLASS, ...COMPOSITES.CODE_QUALITY];
      expect(composed.length).toBe(
        SOURCES_PROMPT_FRAGMENTS.BASE.CLASS.length + COMPOSITES.CODE_QUALITY.length,
      );
    });
  });
});

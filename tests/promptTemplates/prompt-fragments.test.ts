import {
  SOURCES_PROMPT_FRAGMENTS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
  INTEGRATION_POINTS_INSTRUCTIONS,
  SCHEDULED_JOBS_INSTRUCTIONS,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  MODULE_LANGUAGE_BASE_INSTRUCTIONS,
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

  describe("CODE_QUALITY_INSTRUCTIONS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(CODE_QUALITY_INSTRUCTIONS)).toBe(true);
      expect(CODE_QUALITY_INSTRUCTIONS.length).toBeGreaterThan(0);
      CODE_QUALITY_INSTRUCTIONS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include code quality fragments", () => {
      const joined = CODE_QUALITY_INSTRUCTIONS.join(" ");
      expect(joined).toContain("Code Quality Analysis");
      expect(joined).toContain("cyclomaticComplexity");
    });
  });

  describe("DB_INTEGRATION_INSTRUCTIONS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(DB_INTEGRATION_INSTRUCTIONS)).toBe(true);
      expect(DB_INTEGRATION_INSTRUCTIONS.length).toBeGreaterThan(0);
      DB_INTEGRATION_INSTRUCTIONS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include database integration fragments", () => {
      const joined = DB_INTEGRATION_INSTRUCTIONS.join(" ");
      expect(joined).toContain("Database Integration Analysis");
      expect(joined).toContain("mechanism");
    });
  });

  describe("INTEGRATION_POINTS_INSTRUCTIONS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(INTEGRATION_POINTS_INSTRUCTIONS)).toBe(true);
      expect(INTEGRATION_POINTS_INSTRUCTIONS.length).toBeGreaterThan(0);
      INTEGRATION_POINTS_INSTRUCTIONS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include integration points fragment", () => {
      const joined = INTEGRATION_POINTS_INSTRUCTIONS.join(" ");
      expect(joined).toContain("integration points");
    });
  });

  describe("SCHEDULED_JOBS_INSTRUCTIONS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(SCHEDULED_JOBS_INSTRUCTIONS)).toBe(true);
      expect(SCHEDULED_JOBS_INSTRUCTIONS.length).toBeGreaterThan(0);
      SCHEDULED_JOBS_INSTRUCTIONS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include scheduled jobs fragments", () => {
      const joined = SCHEDULED_JOBS_INSTRUCTIONS.join(" ");
      expect(joined).toContain("scheduled jobs");
    });
  });

  describe("CLASS_LANGUAGE_BASE_INSTRUCTIONS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(CLASS_LANGUAGE_BASE_INSTRUCTIONS)).toBe(true);
      expect(CLASS_LANGUAGE_BASE_INSTRUCTIONS.length).toBeGreaterThan(0);
      CLASS_LANGUAGE_BASE_INSTRUCTIONS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include base instructions for class-based languages", () => {
      const joined = CLASS_LANGUAGE_BASE_INSTRUCTIONS.join(" ");
      expect(joined).toContain("class");
      expect(joined).toContain("namespace");
      expect(joined).toContain("interface");
    });
  });

  describe("MODULE_LANGUAGE_BASE_INSTRUCTIONS", () => {
    it("should be an array of strings", () => {
      expect(Array.isArray(MODULE_LANGUAGE_BASE_INSTRUCTIONS)).toBe(true);
      expect(MODULE_LANGUAGE_BASE_INSTRUCTIONS.length).toBeGreaterThan(0);
      MODULE_LANGUAGE_BASE_INSTRUCTIONS.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should include base instructions for module-based languages", () => {
      const joined = MODULE_LANGUAGE_BASE_INSTRUCTIONS.join(" ");
      expect(joined).toContain("entity");
      expect(joined).toContain("module");
      expect(joined).toContain("namespace");
    });
  });

  describe("Composing instructions", () => {
    it("should allow spreading instruction sets", () => {
      const composed = [
        ...INTEGRATION_POINTS_INSTRUCTIONS,
        ...DB_INTEGRATION_INSTRUCTIONS,
        ...CODE_QUALITY_INSTRUCTIONS,
      ];

      expect(composed.length).toBeGreaterThan(0);
      expect(Array.isArray(composed)).toBe(true);
      composed.forEach((instruction) => {
        expect(typeof instruction).toBe("string");
      });
    });

    it("should allow combining instruction sets with custom instructions", () => {
      const customInstructions = ["Custom instruction 1", "Custom instruction 2"];
      const composed = [...INTEGRATION_POINTS_INSTRUCTIONS, ...customInstructions];

      expect(composed.length).toBeGreaterThan(customInstructions.length);
      expect(composed).toContain("Custom instruction 1");
      expect(composed).toContain("Custom instruction 2");
    });

    it("should allow combining base language instructions with code quality instructions", () => {
      const composed = [...CLASS_LANGUAGE_BASE_INSTRUCTIONS, ...CODE_QUALITY_INSTRUCTIONS];
      expect(composed.length).toBe(
        CLASS_LANGUAGE_BASE_INSTRUCTIONS.length + CODE_QUALITY_INSTRUCTIONS.length,
      );
    });
  });
});

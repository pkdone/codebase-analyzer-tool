import {
  SOURCES_FRAGMENTS,
  COMMON_FRAGMENTS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
  INTEGRATION_POINTS_INSTRUCTIONS,
  SCHEDULED_JOBS_INSTRUCTIONS,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  MODULE_LANGUAGE_BASE_INSTRUCTIONS,
} from "../../src/prompts/definitions/fragments";

describe("prompt-fragments", () => {
  describe("PROMPT_FRAGMENTS.COMMON", () => {
    it("should have PURPOSE and IMPLEMENTATION fragments", () => {
      expect(SOURCES_FRAGMENTS.COMMON.PURPOSE).toBeDefined();
      expect(SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION).toBeDefined();
      expect(typeof SOURCES_FRAGMENTS.COMMON.PURPOSE).toBe("string");
      expect(typeof SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION).toBe("string");
    });

    it("should have FORCE_JSON_FORMAT fragment", () => {
      expect(COMMON_FRAGMENTS.FORCE_JSON_FORMAT).toBeDefined();
      expect(typeof COMMON_FRAGMENTS.FORCE_JSON_FORMAT).toBe("string");
      expect(COMMON_FRAGMENTS.FORCE_JSON_FORMAT).toContain(
        "ONLY provide an RFC8259 compliant JSON response",
      );
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

  describe("New detection fragments", () => {
    it("should have REST_API_DETECTION fragment", () => {
      expect(SOURCES_FRAGMENTS.REST_API_DETECTION).toBeDefined();
      expect(SOURCES_FRAGMENTS.REST_API_DETECTION.INTRO).toContain("REST");
    });

    it("should have GRAPHQL_DETECTION fragment", () => {
      expect(SOURCES_FRAGMENTS.GRAPHQL_DETECTION).toBeDefined();
      expect(SOURCES_FRAGMENTS.GRAPHQL_DETECTION.INTRO).toContain("GRAPHQL");
    });

    it("should have GRPC_DETECTION fragment", () => {
      expect(SOURCES_FRAGMENTS.GRPC_DETECTION).toBeDefined();
      expect(SOURCES_FRAGMENTS.GRPC_DETECTION.INTRO).toContain("GRPC");
    });

    it("should have WEBSOCKET_DETECTION fragment", () => {
      expect(SOURCES_FRAGMENTS.WEBSOCKET_DETECTION).toBeDefined();
      expect(SOURCES_FRAGMENTS.WEBSOCKET_DETECTION.INTRO).toContain("WEBSOCKET");
    });

    it("should have MESSAGING_INTRO fragment", () => {
      expect(SOURCES_FRAGMENTS.MESSAGING_INTRO).toBeDefined();
      expect(SOURCES_FRAGMENTS.MESSAGING_INTRO).toContain("Messaging");
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

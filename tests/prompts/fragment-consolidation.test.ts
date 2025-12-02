import {
  SOURCES_PROMPT_FRAGMENTS,
  COMPOSITES,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  MODULE_LANGUAGE_BASE_INSTRUCTIONS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "../../src/prompts/definitions/sources/sources.fragments";

describe("Fragment Consolidation", () => {
  describe("BASE fragments", () => {
    it("should have CLASS instructions in SOURCES_PROMPT_FRAGMENTS.BASE", () => {
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.CLASS).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.CLASS).toHaveLength(3);
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.CLASS[0]).toContain("name");
    });

    it("should have MODULE instructions in SOURCES_PROMPT_FRAGMENTS.BASE", () => {
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.MODULE).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.MODULE).toHaveLength(3);
      expect(SOURCES_PROMPT_FRAGMENTS.BASE.MODULE[0]).toContain("entity");
    });

    it("should maintain backward compatibility with legacy exports", () => {
      expect(CLASS_LANGUAGE_BASE_INSTRUCTIONS).toBe(SOURCES_PROMPT_FRAGMENTS.BASE.CLASS);
      expect(MODULE_LANGUAGE_BASE_INSTRUCTIONS).toBe(SOURCES_PROMPT_FRAGMENTS.BASE.MODULE);
    });
  });

  describe("COMPOSITES", () => {
    it("should have CODE_QUALITY composite", () => {
      expect(COMPOSITES.CODE_QUALITY).toBeDefined();
      expect(COMPOSITES.CODE_QUALITY.length).toBeGreaterThan(0);
      expect(COMPOSITES.CODE_QUALITY).toContain(SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.INTRO);
    });

    it("should have DB_INTEGRATION composite", () => {
      expect(COMPOSITES.DB_INTEGRATION).toBeDefined();
      expect(COMPOSITES.DB_INTEGRATION.length).toBeGreaterThan(0);
      expect(COMPOSITES.DB_INTEGRATION).toContain(SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO);
    });

    it("should maintain backward compatibility with legacy exports", () => {
      expect(CODE_QUALITY_INSTRUCTIONS).toBe(COMPOSITES.CODE_QUALITY);
      expect(DB_INTEGRATION_INSTRUCTIONS).toBe(COMPOSITES.DB_INTEGRATION);
    });
  });

  describe("Fragment organization", () => {
    it("should have all main fragment categories", () => {
      expect(SOURCES_PROMPT_FRAGMENTS.COMMON).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.BASE).toBeDefined();
    });

    it("should have language-specific fragments", () => {
      expect(SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC).toBeDefined();
      expect(SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC).toBeDefined();
    });
  });
});

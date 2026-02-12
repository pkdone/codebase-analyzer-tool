import {
  BASE_FRAGMENTS,
  COMMON_FRAGMENTS,
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC_FRAGMENTS,
  CSHARP_SPECIFIC_FRAGMENTS,
  PYTHON_SPECIFIC_FRAGMENTS,
  RUBY_SPECIFIC_FRAGMENTS,
  PRECONFIGURED_INSTRUCTION_SETS,
} from "../../../src/app/prompts/sources/fragments";

describe("Fragment Consolidation", () => {
  describe("BASE fragments", () => {
    it("should have CLASS instructions in BASE_FRAGMENTS", () => {
      expect(BASE_FRAGMENTS.CLASS).toBeDefined();
      expect(BASE_FRAGMENTS.CLASS).toHaveLength(3);
      expect(BASE_FRAGMENTS.CLASS[0]).toContain("name");
    });

    it("should have MODULE instructions in BASE_FRAGMENTS", () => {
      expect(BASE_FRAGMENTS.MODULE).toBeDefined();
      expect(BASE_FRAGMENTS.MODULE).toHaveLength(3);
      expect(BASE_FRAGMENTS.MODULE[0]).toContain("entity");
    });
  });

  describe("PRECONFIGURED_INSTRUCTION_SETS", () => {
    it("should have CODE_QUALITY composite", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY).toBeDefined();
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY.length).toBeGreaterThan(0);
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY).toContain(CODE_QUALITY_FRAGMENTS.INTRO);
    });

    it("should have DB_INTEGRATION composite", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION).toBeDefined();
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION.length).toBeGreaterThan(0);
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION).toContain(
        DB_INTEGRATION_FRAGMENTS.INTRO,
      );
    });

    it("should have INTEGRATION_POINTS composite", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.INTEGRATION_POINTS).toBeDefined();
      expect(PRECONFIGURED_INSTRUCTION_SETS.INTEGRATION_POINTS.length).toBeGreaterThan(0);
    });

    it("should have SCHEDULED_JOBS composite", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS).toBeDefined();
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS.length).toBeGreaterThan(0);
    });
  });

  describe("Fragment organization", () => {
    it("should have all main fragment categories", () => {
      expect(COMMON_FRAGMENTS).toBeDefined();
      expect(CODE_QUALITY_FRAGMENTS).toBeDefined();
      expect(DB_INTEGRATION_FRAGMENTS).toBeDefined();
      expect(INTEGRATION_POINTS_FRAGMENTS).toBeDefined();
      expect(SCHEDULED_JOBS_FRAGMENTS).toBeDefined();
      expect(BASE_FRAGMENTS).toBeDefined();
    });

    it("should have language-specific fragments", () => {
      expect(JAVA_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(JAVASCRIPT_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(CSHARP_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(PYTHON_SPECIFIC_FRAGMENTS).toBeDefined();
      expect(RUBY_SPECIFIC_FRAGMENTS).toBeDefined();
    });
  });
});

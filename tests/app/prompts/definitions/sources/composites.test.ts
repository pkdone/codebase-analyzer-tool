/**
 * Tests for PRECONFIGURED_INSTRUCTION_SETS - pre-composed instruction sets for common patterns.
 */
import { PRECONFIGURED_INSTRUCTION_SETS } from "../../../../../src/app/prompts/sources/fragments";
import {
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
} from "../../../../../src/app/prompts/sources/fragments";

describe("PRECONFIGURED_INSTRUCTION_SETS", () => {
  describe("CODE_QUALITY", () => {
    it("should contain all code quality fragments in correct order", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY).toEqual([
        CODE_QUALITY_FRAGMENTS.INTRO,
        CODE_QUALITY_FRAGMENTS.FUNCTION_METRICS,
        CODE_QUALITY_FRAGMENTS.FUNCTION_SMELLS,
        CODE_QUALITY_FRAGMENTS.FILE_METRICS,
      ]);
    });

    it("should have 4 fragments", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY.length).toBe(4);
    });

    it("should contain intro fragment first", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY[0]).toContain("Code Quality Analysis");
    });

    it("should contain function metrics fragment", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY[1]).toContain("cyclomaticComplexity");
    });

    it("should contain function smells fragment", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY[2]).toContain("LONG METHOD");
    });

    it("should contain file metrics fragment", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY[3]).toContain("totalFunctions");
    });
  });

  describe("DB_INTEGRATION", () => {
    it("should contain intro and required fields fragments", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION).toEqual([
        DB_INTEGRATION_FRAGMENTS.INTRO,
        DB_INTEGRATION_FRAGMENTS.REQUIRED_FIELDS,
      ]);
    });

    it("should have 2 fragments", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION.length).toBe(2);
    });

    it("should contain database integration intro", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION[0]).toContain(
        "Database Integration Analysis",
      );
    });

    it("should contain required fields with mechanism info", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION[1]).toContain("mechanism (REQUIRED)");
    });
  });

  describe("INTEGRATION_POINTS", () => {
    it("should contain intro fragment only", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.INTEGRATION_POINTS).toEqual([
        INTEGRATION_POINTS_FRAGMENTS.INTRO,
      ]);
    });

    it("should have 1 fragment", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.INTEGRATION_POINTS.length).toBe(1);
    });

    it("should contain integration points description", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.INTEGRATION_POINTS[0]).toContain("integration points");
    });
  });

  describe("SCHEDULED_JOBS", () => {
    it("should contain intro and fields fragments", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS).toEqual([
        SCHEDULED_JOBS_FRAGMENTS.INTRO,
        SCHEDULED_JOBS_FRAGMENTS.FIELDS,
      ]);
    });

    it("should have 2 fragments", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS.length).toBe(2);
    });

    it("should contain scheduled jobs intro", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS[0]).toContain("scheduled jobs");
    });

    it("should contain job fields like jobName and trigger", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS[1]).toContain("jobName");
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS[1]).toContain("trigger");
    });
  });

  describe("structure validation", () => {
    it("should be readonly (using as const)", () => {
      // TypeScript enforces readonly at compile time
      // At runtime, we verify the structure exists
      expect(Object.keys(PRECONFIGURED_INSTRUCTION_SETS)).toEqual([
        "CODE_QUALITY",
        "DB_INTEGRATION",
        "INTEGRATION_POINTS",
        "SCHEDULED_JOBS",
      ]);
    });

    it("should have all composites defined with non-empty arrays", () => {
      expect(PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY.length).toBeGreaterThan(0);
      expect(PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION.length).toBeGreaterThan(0);
      expect(PRECONFIGURED_INSTRUCTION_SETS.INTEGRATION_POINTS.length).toBeGreaterThan(0);
      expect(PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS.length).toBeGreaterThan(0);
    });

    it("should only contain string fragments", () => {
      const allFragments = [
        ...PRECONFIGURED_INSTRUCTION_SETS.CODE_QUALITY,
        ...PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION,
        ...PRECONFIGURED_INSTRUCTION_SETS.INTEGRATION_POINTS,
        ...PRECONFIGURED_INSTRUCTION_SETS.SCHEDULED_JOBS,
      ];

      allFragments.forEach((fragment) => {
        expect(typeof fragment).toBe("string");
        expect(fragment.length).toBeGreaterThan(0);
      });
    });
  });
});

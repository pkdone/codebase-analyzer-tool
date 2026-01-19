/**
 * Tests for COMPOSITES - pre-composed instruction sets for common patterns.
 */
import { COMPOSITES } from "../../../../../src/app/prompts/sources/fragments/composites";
import {
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
} from "../../../../../src/app/prompts/sources/fragments";

describe("COMPOSITES", () => {
  describe("CODE_QUALITY", () => {
    it("should contain all code quality fragments in correct order", () => {
      expect(COMPOSITES.CODE_QUALITY).toEqual([
        CODE_QUALITY_FRAGMENTS.INTRO,
        CODE_QUALITY_FRAGMENTS.FUNCTION_METRICS,
        CODE_QUALITY_FRAGMENTS.FUNCTION_SMELLS,
        CODE_QUALITY_FRAGMENTS.FILE_METRICS,
      ]);
    });

    it("should have 4 fragments", () => {
      expect(COMPOSITES.CODE_QUALITY.length).toBe(4);
    });

    it("should contain intro fragment first", () => {
      expect(COMPOSITES.CODE_QUALITY[0]).toContain("Code Quality Analysis");
    });

    it("should contain function metrics fragment", () => {
      expect(COMPOSITES.CODE_QUALITY[1]).toContain("cyclomaticComplexity");
    });

    it("should contain function smells fragment", () => {
      expect(COMPOSITES.CODE_QUALITY[2]).toContain("LONG METHOD");
    });

    it("should contain file metrics fragment", () => {
      expect(COMPOSITES.CODE_QUALITY[3]).toContain("totalFunctions");
    });
  });

  describe("DB_INTEGRATION", () => {
    it("should contain intro and required fields fragments", () => {
      expect(COMPOSITES.DB_INTEGRATION).toEqual([
        DB_INTEGRATION_FRAGMENTS.INTRO,
        DB_INTEGRATION_FRAGMENTS.REQUIRED_FIELDS,
      ]);
    });

    it("should have 2 fragments", () => {
      expect(COMPOSITES.DB_INTEGRATION.length).toBe(2);
    });

    it("should contain database integration intro", () => {
      expect(COMPOSITES.DB_INTEGRATION[0]).toContain("Database Integration Analysis");
    });

    it("should contain required fields with mechanism info", () => {
      expect(COMPOSITES.DB_INTEGRATION[1]).toContain("mechanism (REQUIRED)");
    });
  });

  describe("INTEGRATION_POINTS", () => {
    it("should contain intro fragment only", () => {
      expect(COMPOSITES.INTEGRATION_POINTS).toEqual([INTEGRATION_POINTS_FRAGMENTS.INTRO]);
    });

    it("should have 1 fragment", () => {
      expect(COMPOSITES.INTEGRATION_POINTS.length).toBe(1);
    });

    it("should contain integration points description", () => {
      expect(COMPOSITES.INTEGRATION_POINTS[0]).toContain("integration points");
    });
  });

  describe("SCHEDULED_JOBS", () => {
    it("should contain intro and fields fragments", () => {
      expect(COMPOSITES.SCHEDULED_JOBS).toEqual([
        SCHEDULED_JOBS_FRAGMENTS.INTRO,
        SCHEDULED_JOBS_FRAGMENTS.FIELDS,
      ]);
    });

    it("should have 2 fragments", () => {
      expect(COMPOSITES.SCHEDULED_JOBS.length).toBe(2);
    });

    it("should contain scheduled jobs intro", () => {
      expect(COMPOSITES.SCHEDULED_JOBS[0]).toContain("scheduled jobs");
    });

    it("should contain job fields like jobName and trigger", () => {
      expect(COMPOSITES.SCHEDULED_JOBS[1]).toContain("jobName");
      expect(COMPOSITES.SCHEDULED_JOBS[1]).toContain("trigger");
    });
  });

  describe("structure validation", () => {
    it("should be readonly (using as const)", () => {
      // TypeScript enforces readonly at compile time
      // At runtime, we verify the structure exists
      expect(Object.keys(COMPOSITES)).toEqual([
        "CODE_QUALITY",
        "DB_INTEGRATION",
        "INTEGRATION_POINTS",
        "SCHEDULED_JOBS",
      ]);
    });

    it("should have all composites defined with non-empty arrays", () => {
      expect(COMPOSITES.CODE_QUALITY.length).toBeGreaterThan(0);
      expect(COMPOSITES.DB_INTEGRATION.length).toBeGreaterThan(0);
      expect(COMPOSITES.INTEGRATION_POINTS.length).toBeGreaterThan(0);
      expect(COMPOSITES.SCHEDULED_JOBS.length).toBeGreaterThan(0);
    });

    it("should only contain string fragments", () => {
      const allFragments = [
        ...COMPOSITES.CODE_QUALITY,
        ...COMPOSITES.DB_INTEGRATION,
        ...COMPOSITES.INTEGRATION_POINTS,
        ...COMPOSITES.SCHEDULED_JOBS,
      ];

      allFragments.forEach((fragment) => {
        expect(typeof fragment).toBe("string");
        expect(fragment.length).toBeGreaterThan(0);
      });
    });
  });
});

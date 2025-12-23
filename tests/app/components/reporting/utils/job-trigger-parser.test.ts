import "reflect-metadata";
import {
  extractTriggerType,
  TRIGGER_TYPE_PATTERNS,
} from "../../../../../src/app/components/reporting/sections/quality-metrics/job-trigger-parser";

describe("job-trigger-parser", () => {
  describe("TRIGGER_TYPE_PATTERNS", () => {
    it("should have all required trigger type patterns defined in correct order", () => {
      // More specific patterns must come before broader patterns
      // e.g., "task-scheduler" before "scheduled"
      const expectedTypes = [
        "cron",
        "task-scheduler", // Must come before "scheduled" since "task scheduler" contains "schedule"
        "scheduled",
        "manual",
        "event-driven",
        "systemd-timer",
      ];

      const actualTypes = TRIGGER_TYPE_PATTERNS.map((p) => p.type);
      expect(actualTypes).toEqual(expectedTypes);
    });

    it("should have match functions for all patterns", () => {
      for (const pattern of TRIGGER_TYPE_PATTERNS) {
        expect(typeof pattern.match).toBe("function");
        expect(typeof pattern.type).toBe("string");
      }
    });
  });

  describe("extractTriggerType", () => {
    it("should extract cron trigger type", () => {
      expect(extractTriggerType("cron: 0 2 * * *")).toBe("cron");
      expect(extractTriggerType("cron 0 2 * * *")).toBe("cron");
      expect(extractTriggerType("crontab entry")).toBe("cron");
      expect(extractTriggerType("CRON: 0 0 * * *")).toBe("cron");
      expect(extractTriggerType("Cron: 0 0 * * *")).toBe("cron");
    });

    it("should extract scheduled trigger type", () => {
      expect(extractTriggerType("scheduled daily at midnight")).toBe("scheduled");
      expect(extractTriggerType("schedule: every 6 hours")).toBe("scheduled");
      expect(extractTriggerType("SCHEDULED")).toBe("scheduled");
      expect(extractTriggerType("Schedule")).toBe("scheduled");
    });

    it("should extract manual trigger type", () => {
      expect(extractTriggerType("manual")).toBe("manual");
      expect(extractTriggerType("triggered manually by operator")).toBe("manual");
      expect(extractTriggerType("MANUAL")).toBe("manual");
      expect(extractTriggerType("Manual")).toBe("manual");
    });

    it("should extract event-driven trigger type", () => {
      expect(extractTriggerType("event: file arrival")).toBe("event-driven");
      expect(extractTriggerType("triggered on event")).toBe("event-driven");
      expect(extractTriggerType("EVENT")).toBe("event-driven");
      expect(extractTriggerType("Event")).toBe("event-driven");
    });

    it("should extract systemd-timer trigger type", () => {
      expect(extractTriggerType("systemd timer unit")).toBe("systemd-timer");
      expect(extractTriggerType("timer: daily")).toBe("systemd-timer");
      expect(extractTriggerType("SYSTEMD")).toBe("systemd-timer");
      expect(extractTriggerType("Timer")).toBe("systemd-timer");
    });

    it("should extract task-scheduler trigger type (before scheduled)", () => {
      expect(extractTriggerType("task scheduler")).toBe("task-scheduler");
      expect(extractTriggerType("schtasks /create")).toBe("task-scheduler");
      expect(extractTriggerType("Windows Task Scheduler")).toBe("task-scheduler");
      expect(extractTriggerType("TASK SCHEDULER")).toBe("task-scheduler");
      expect(extractTriggerType("SCHTASKS")).toBe("task-scheduler");
    });

    it("should return first word for unknown trigger types", () => {
      expect(extractTriggerType("webhook: POST /api/trigger")).toBe("webhook");
      expect(extractTriggerType("custom: some value")).toBe("custom");
      expect(extractTriggerType("startup initialization")).toBe("startup");
      expect(extractTriggerType("boot, startup")).toBe("boot");
    });

    it("should return 'unknown' for empty strings", () => {
      expect(extractTriggerType("")).toBe("unknown");
      expect(extractTriggerType("   ")).toBe("unknown");
    });

    it("should prioritize more specific patterns", () => {
      // "task scheduler" should match "task-scheduler" before "scheduled"
      expect(extractTriggerType("cron scheduled daily")).toBe("cron");
      expect(extractTriggerType("manually scheduled task")).toBe("scheduled");
    });

    it("should handle whitespace and case insensitivity", () => {
      expect(extractTriggerType("  cron: 0 2 * * *")).toBe("cron");
      expect(extractTriggerType("cron: 0 2 * * *  ")).toBe("cron");
      expect(extractTriggerType("  manual  ")).toBe("manual");
    });
  });
});

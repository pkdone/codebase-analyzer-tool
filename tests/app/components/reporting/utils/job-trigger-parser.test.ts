import "reflect-metadata";
import { extractTriggerType } from "../../../../../src/app/components/reporting/sections/quality-metrics/job-trigger-parser";

describe("job-trigger-parser", () => {
  describe("extractTriggerType", () => {
    it("should extract trigger types in correct order (more specific first)", () => {
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

      // Test that the function returns the expected types for various inputs
      const actualTypes = [
        extractTriggerType("cron: 0 2 * * *"),
        extractTriggerType("task scheduler"),
        extractTriggerType("scheduled job"),
        extractTriggerType("manual trigger"),
        extractTriggerType("event-driven"),
        extractTriggerType("systemd timer"),
      ];
      expect(actualTypes).toEqual(expectedTypes);
    });

    it("should correctly categorize trigger types", () => {
      expect(extractTriggerType("cron: 0 2 * * *")).toBe("cron");
      expect(extractTriggerType("task scheduler")).toBe("task-scheduler");
      expect(extractTriggerType("scheduled")).toBe("scheduled");
      expect(extractTriggerType("manual")).toBe("manual");
      expect(extractTriggerType("event")).toBe("event-driven");
      expect(extractTriggerType("systemd")).toBe("systemd-timer");
    });
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

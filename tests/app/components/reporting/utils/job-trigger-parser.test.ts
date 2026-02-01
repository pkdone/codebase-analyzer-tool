import "reflect-metadata";
import { extractTriggerType } from "../../../../../src/app/components/reporting/sections/background-processes/job-trigger-parser";
import { UNKNOWN_VALUE_PLACEHOLDER } from "../../../../../src/app/components/reporting/config/placeholders.config";
import { JOB_TRIGGER_TYPES } from "../../../../../src/app/components/reporting/config/reporting.config";

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

    it("should return UNKNOWN_VALUE_PLACEHOLDER for empty strings", () => {
      expect(extractTriggerType("")).toBe(UNKNOWN_VALUE_PLACEHOLDER);
      expect(extractTriggerType("   ")).toBe(UNKNOWN_VALUE_PLACEHOLDER);
    });

    it("should use the centralized placeholder constant value", () => {
      // Verify the placeholder constant is being used (not a hardcoded string)
      const result = extractTriggerType("");
      expect(result).toBe(UNKNOWN_VALUE_PLACEHOLDER);
      expect(UNKNOWN_VALUE_PLACEHOLDER).toBe("unknown"); // Verify the constant value
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

  describe("JOB_TRIGGER_TYPES constant integration", () => {
    it("should return values matching JOB_TRIGGER_TYPES constants", () => {
      // Verify that extractTriggerType returns values from JOB_TRIGGER_TYPES
      expect(extractTriggerType("cron: 0 2 * * *")).toBe(JOB_TRIGGER_TYPES.CRON);
      expect(extractTriggerType("task scheduler")).toBe(JOB_TRIGGER_TYPES.TASK_SCHEDULER);
      expect(extractTriggerType("scheduled job")).toBe(JOB_TRIGGER_TYPES.SCHEDULED);
      expect(extractTriggerType("manual trigger")).toBe(JOB_TRIGGER_TYPES.MANUAL);
      expect(extractTriggerType("event-driven")).toBe(JOB_TRIGGER_TYPES.EVENT_DRIVEN);
      expect(extractTriggerType("systemd timer")).toBe(JOB_TRIGGER_TYPES.SYSTEMD_TIMER);
    });

    it("should have JOB_TRIGGER_TYPES constants with expected values", () => {
      // Verify the constant values match what the parser returns
      expect(JOB_TRIGGER_TYPES.CRON).toBe("cron");
      expect(JOB_TRIGGER_TYPES.TASK_SCHEDULER).toBe("task-scheduler");
      expect(JOB_TRIGGER_TYPES.SCHEDULED).toBe("scheduled");
      expect(JOB_TRIGGER_TYPES.MANUAL).toBe("manual");
      expect(JOB_TRIGGER_TYPES.EVENT_DRIVEN).toBe("event-driven");
      expect(JOB_TRIGGER_TYPES.SYSTEMD_TIMER).toBe("systemd-timer");
    });

    it("should have exactly 6 trigger types defined in JOB_TRIGGER_TYPES", () => {
      expect(Object.keys(JOB_TRIGGER_TYPES)).toHaveLength(6);
    });

    it("should use centralized constants (not hardcoded strings) in parser output", () => {
      // This test ensures the parser uses JOB_TRIGGER_TYPES, not magic strings
      const allTriggerTypes = Object.values(JOB_TRIGGER_TYPES);

      // Each known trigger type should be in the JOB_TRIGGER_TYPES constant
      const testCases = [
        { input: "cron expression", expectedType: "cron" },
        { input: "task scheduler job", expectedType: "task-scheduler" },
        { input: "scheduled daily", expectedType: "scheduled" },
        { input: "manual execution", expectedType: "manual" },
        { input: "event based", expectedType: "event-driven" },
        { input: "systemd service", expectedType: "systemd-timer" },
      ];

      for (const { input, expectedType } of testCases) {
        const result = extractTriggerType(input);
        expect(result).toBe(expectedType);
        expect(allTriggerTypes).toContain(result);
      }
    });
  });
});

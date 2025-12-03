import "reflect-metadata";
import {
  extractTriggerType,
  TRIGGER_TYPE_PATTERNS,
} from "../../../../src/components/reporting/data-providers/job-data-provider";

describe("job-data-provider", () => {
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
    describe("cron triggers", () => {
      it('should return "cron" for standard cron expression', () => {
        expect(extractTriggerType("cron: 0 2 * * *")).toBe("cron");
      });

      it('should return "cron" for cron without colon', () => {
        expect(extractTriggerType("cron 0 2 * * *")).toBe("cron");
      });

      it('should return "cron" for crontab format', () => {
        expect(extractTriggerType("crontab entry")).toBe("cron");
      });

      it("should be case insensitive for cron", () => {
        expect(extractTriggerType("CRON: 0 0 * * *")).toBe("cron");
        expect(extractTriggerType("Cron: 0 0 * * *")).toBe("cron");
      });
    });

    describe("scheduled triggers", () => {
      it('should return "scheduled" for scheduled keyword', () => {
        expect(extractTriggerType("scheduled daily at midnight")).toBe("scheduled");
      });

      it('should return "scheduled" for schedule keyword', () => {
        expect(extractTriggerType("schedule: every 6 hours")).toBe("scheduled");
      });

      it("should be case insensitive for scheduled", () => {
        expect(extractTriggerType("SCHEDULED")).toBe("scheduled");
        expect(extractTriggerType("Schedule")).toBe("scheduled");
      });
    });

    describe("manual triggers", () => {
      it('should return "manual" for manual keyword', () => {
        expect(extractTriggerType("manual")).toBe("manual");
      });

      it('should return "manual" for manual invocation description', () => {
        expect(extractTriggerType("triggered manually by operator")).toBe("manual");
      });

      it("should be case insensitive for manual", () => {
        expect(extractTriggerType("MANUAL")).toBe("manual");
        expect(extractTriggerType("Manual")).toBe("manual");
      });
    });

    describe("event-driven triggers", () => {
      it('should return "event-driven" for event keyword', () => {
        expect(extractTriggerType("event: file arrival")).toBe("event-driven");
      });

      it('should return "event-driven" for event-based description', () => {
        expect(extractTriggerType("triggered on event")).toBe("event-driven");
      });

      it("should be case insensitive for event", () => {
        expect(extractTriggerType("EVENT")).toBe("event-driven");
        expect(extractTriggerType("Event")).toBe("event-driven");
      });
    });

    describe("systemd-timer triggers", () => {
      it('should return "systemd-timer" for systemd keyword', () => {
        expect(extractTriggerType("systemd timer unit")).toBe("systemd-timer");
      });

      it('should return "systemd-timer" for timer keyword', () => {
        expect(extractTriggerType("timer: daily")).toBe("systemd-timer");
      });

      it("should be case insensitive for systemd/timer", () => {
        expect(extractTriggerType("SYSTEMD")).toBe("systemd-timer");
        expect(extractTriggerType("Timer")).toBe("systemd-timer");
      });
    });

    describe("task-scheduler triggers", () => {
      it('should return "task-scheduler" for task scheduler keyword', () => {
        expect(extractTriggerType("task scheduler")).toBe("task-scheduler");
      });

      it('should return "task-scheduler" for schtasks keyword', () => {
        expect(extractTriggerType("schtasks /create")).toBe("task-scheduler");
      });

      it('should return "task-scheduler" for Windows Task Scheduler description', () => {
        expect(extractTriggerType("Windows Task Scheduler")).toBe("task-scheduler");
      });

      it("should be case insensitive for task scheduler/schtasks", () => {
        expect(extractTriggerType("TASK SCHEDULER")).toBe("task-scheduler");
        expect(extractTriggerType("SCHTASKS")).toBe("task-scheduler");
      });
    });

    describe("fallback behavior", () => {
      it("should return first word for unknown trigger types", () => {
        expect(extractTriggerType("webhook: POST /api/trigger")).toBe("webhook");
      });

      it("should return first word when using colon separator", () => {
        expect(extractTriggerType("custom: some value")).toBe("custom");
      });

      it("should return first word when using space separator", () => {
        expect(extractTriggerType("startup initialization")).toBe("startup");
      });

      it("should return first word when using comma separator", () => {
        expect(extractTriggerType("boot, startup")).toBe("boot");
      });

      it('should return "unknown" for empty string', () => {
        expect(extractTriggerType("")).toBe("unknown");
      });

      it('should return "unknown" for whitespace-only string', () => {
        expect(extractTriggerType("   ")).toBe("unknown");
      });
    });

    describe("pattern priority", () => {
      it("should prioritize cron over other patterns when trigger starts with cron", () => {
        // "cron" should match first even if other keywords are present
        expect(extractTriggerType("cron scheduled daily")).toBe("cron");
      });

      it("should match scheduled before manual when both are present", () => {
        // "scheduled" comes before "manual" in pattern order
        expect(extractTriggerType("manually scheduled task")).toBe("scheduled");
      });
    });

    describe("whitespace handling", () => {
      it("should trim leading whitespace", () => {
        expect(extractTriggerType("  cron: 0 2 * * *")).toBe("cron");
      });

      it("should trim trailing whitespace", () => {
        expect(extractTriggerType("cron: 0 2 * * *  ")).toBe("cron");
      });

      it("should handle mixed whitespace", () => {
        expect(extractTriggerType("  manual  ")).toBe("manual");
      });
    });
  });
});

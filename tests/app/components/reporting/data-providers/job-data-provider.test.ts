import "reflect-metadata";
import { extractTriggerType } from "../../../../../src/app/components/reporting/sections/background-processes/job-trigger-parser";

describe("job-data-provider", () => {
  describe("extractTriggerType", () => {
    it("should extract trigger types in correct order (more specific first)", () => {
      // More specific patterns must come before broader patterns
      // e.g., "task-scheduler" before "scheduled"
      // Test that the function returns the expected types for various inputs
      expect(extractTriggerType("cron: 0 2 * * *")).toBe("cron");
      expect(extractTriggerType("task scheduler")).toBe("task-scheduler");
      expect(extractTriggerType("scheduled job")).toBe("scheduled");
      expect(extractTriggerType("manual trigger")).toBe("manual");
      expect(extractTriggerType("event-driven")).toBe("event-driven");
      expect(extractTriggerType("systemd timer")).toBe("systemd-timer");
    });

    it("should correctly categorize trigger types", () => {
      expect(extractTriggerType("cron: 0 2 * * *")).toBe("cron");
      expect(extractTriggerType("task scheduler")).toBe("task-scheduler");
      expect(extractTriggerType("scheduled")).toBe("scheduled");
      expect(extractTriggerType("manual")).toBe("manual");
      expect(extractTriggerType("event")).toBe("event-driven");
      expect(extractTriggerType("systemd")).toBe("systemd-timer");
    });
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

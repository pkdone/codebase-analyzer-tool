import { UNKNOWN_VALUE_PLACEHOLDER } from "../../../../../common/constants/application.constants";

/**
 * Pattern definition for trigger type matching.
 * Each pattern has a match function and the resulting type string.
 */
interface TriggerTypePattern {
  readonly match: (normalized: string) => boolean;
  readonly type: string;
}

/**
 * Data-driven trigger type patterns for categorizing job triggers.
 * Patterns are evaluated in order; first match wins.
 * More specific patterns (e.g., "task-scheduler") must come before broader patterns (e.g., "scheduled").
 * This approach makes it easy to add, remove, or reorder trigger patterns.
 */
const TRIGGER_TYPE_PATTERNS: readonly TriggerTypePattern[] = [
  { match: (s) => s.startsWith("cron"), type: "cron" },
  { match: (s) => s.includes("task scheduler") || s.includes("schtasks"), type: "task-scheduler" },
  { match: (s) => s.includes("scheduled") || s.includes("schedule"), type: "scheduled" },
  { match: (s) => s.includes("manual"), type: "manual" },
  { match: (s) => s.includes("event"), type: "event-driven" },
  { match: (s) => s.includes("systemd") || s.includes("timer"), type: "systemd-timer" },
] as const;

/**
 * Extracts the trigger type from a trigger string using data-driven pattern matching.
 * Exported for testability while also being used internally by ScheduledJobDataProvider.
 *
 * @param trigger - The trigger string to categorize (e.g., "cron: 0 2 * * *")
 * @returns The categorized trigger type (e.g., "cron", "manual", "scheduled")
 */
export function extractTriggerType(trigger: string): string {
  const normalized = trigger.toLowerCase().trim();

  // Find first matching pattern
  const matchedPattern = TRIGGER_TYPE_PATTERNS.find((pattern) => pattern.match(normalized));
  if (matchedPattern) {
    return matchedPattern.type;
  }

  // Default to the first word if no pattern matches
  const firstWord = normalized.split(/[\s:,]/)[0];
  return firstWord || UNKNOWN_VALUE_PLACEHOLDER;
}

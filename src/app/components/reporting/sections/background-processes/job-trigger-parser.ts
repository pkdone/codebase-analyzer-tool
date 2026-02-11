/**
 * Parser for extracting trigger type from job trigger strings.
 * Handles various formats like "cron: 0 2 * * *", "schedule: daily", etc.
 */

import { UNKNOWN_VALUE_PLACEHOLDER } from "../../config/placeholders.config";
import { JOB_TRIGGER_TYPES, type JobTriggerType } from "../../config/reporting.config";

/**
 * Trigger type patterns ordered from most specific to least specific.
 * More specific patterns must come first to prevent false matches.
 * Uses centralized JOB_TRIGGER_TYPES constants for the type values.
 */
const TRIGGER_PATTERNS: { type: JobTriggerType; keywords: string[] }[] = [
  { type: JOB_TRIGGER_TYPES.CRON, keywords: ["cron", "crontab"] },
  {
    type: JOB_TRIGGER_TYPES.TASK_SCHEDULER,
    keywords: ["task scheduler", "schtasks", "task_scheduler"],
  },
  { type: JOB_TRIGGER_TYPES.SCHEDULED, keywords: ["scheduled", "schedule"] },
  { type: JOB_TRIGGER_TYPES.MANUAL, keywords: ["manual"] },
  { type: JOB_TRIGGER_TYPES.EVENT_DRIVEN, keywords: ["event"] },
  { type: JOB_TRIGGER_TYPES.SYSTEMD_TIMER, keywords: ["systemd", "timer"] },
];

/**
 * Extracts the trigger type from a trigger string.
 * Uses pattern matching to identify known trigger types.
 *
 * @param trigger - The raw trigger string (e.g., "cron: 0 2 * * *")
 * @returns The trigger type (e.g., "cron", "scheduled", "manual", or first word for unknown)
 */
export function extractTriggerType(trigger: string): string {
  const trimmed = trigger.trim();

  // Handle empty strings
  if (trimmed === "") {
    return UNKNOWN_VALUE_PLACEHOLDER;
  }

  const normalized = trimmed.toLowerCase();

  // Check against known patterns in order of specificity
  for (const pattern of TRIGGER_PATTERNS) {
    for (const keyword of pattern.keywords) {
      if (normalized.includes(keyword)) {
        return pattern.type;
      }
    }
  }

  // For unknown types, extract the first word
  // Handle colon separator (e.g., "custom: value")
  const colonIndex = normalized.indexOf(":");

  if (colonIndex !== -1) {
    return normalized.substring(0, colonIndex).trim();
  }

  // Handle space separator (e.g., "startup initialization")
  const spaceIndex = normalized.indexOf(" ");

  if (spaceIndex !== -1) {
    const firstWord = normalized.substring(0, spaceIndex).trim();
    // Remove trailing punctuation like comma
    return firstWord.replace(/[,;]$/, "");
  }

  // Return the whole string if no separator
  return normalized;
}

import {
  LLMStatsCategoryStatus,
  LLMStatsCategoriesSummary,
  LLMStatsCategoriesBase,
} from "../types/llm.types";

/**
 * Immutable status definition containing static metadata about each status type.
 */
interface StatusDefinition {
  readonly description: string;
  readonly symbol: string;
}

/**
 * Static definitions for each status type (immutable).
 */
const STATUS_DEFINITIONS: Readonly<Record<keyof LLMStatsCategoriesBase, StatusDefinition>> = {
  SUCCESS: { description: "LLM invocation succeeded", symbol: ">" },
  FAILURE: { description: "LLM invocation failed (no data produced)", symbol: "!" },
  SWITCH: { description: "Switched to fallback LLM to try to process request", symbol: "+" },
  OVERLOAD_RETRY: {
    description: "Retried calling LLM due to provider overload or network issue",
    symbol: "?",
  },
  HOPEFUL_RETRY: {
    description: "Retried calling LLM due to invalid JSON response (a hopeful re-attempt)",
    symbol: "~",
  },
  CROP: { description: "Cropping prompt due to excessive size, before resending", symbol: "-" },
  JSON_MUTATED: {
    description: "LLM response was mutated to force it to be valid JSON",
    symbol: "#",
  },
} as const;

/**
 * Type for the count storage - uses a separate mutable record for counts.
 */
type StatusCounts = Record<keyof LLMStatsCategoriesBase, number>;

/**
 * Class for tracking and logging telemetry data for LLM invocation events.
 * Uses an immutable pattern where status definitions are constant and counts are
 * tracked separately. This design encapsulates mutation and returns immutable
 * snapshots via getStatusTypesStatistics().
 */
export default class LLMTelemetryTracker {
  private readonly shouldPrintEventTicks: boolean;
  private readonly counts: StatusCounts;

  /**
   * Constructor - initializes counts to zero.
   */
  constructor() {
    this.shouldPrintEventTicks = true;
    this.counts = {
      SUCCESS: 0,
      FAILURE: 0,
      SWITCH: 0,
      OVERLOAD_RETRY: 0,
      HOPEFUL_RETRY: 0,
      CROP: 0,
      JSON_MUTATED: 0,
    };
  }

  /**
   * Log LLM success event occurrence and print its symbol
   */
  recordSuccess(): void {
    this.record("SUCCESS");
  }

  /**
   * Log LLM failure event occurrence and print its symbol
   */
  recordFailure(): void {
    this.record("FAILURE");
  }

  /**
   * Log LLM switch event occurrence and print its symbol
   */
  recordSwitch(): void {
    this.record("SWITCH");
  }

  /**
   * Log LLM overload retry event occurrence and print its symbol
   */
  recordOverloadRetry(): void {
    this.record("OVERLOAD_RETRY");
  }

  /**
   * Log LLM invalid JSON retry event occurrence and print its symbol
   */
  recordHopefulRetry(): void {
    this.record("HOPEFUL_RETRY");
  }

  /**
   * Log LLM reactive truncate event occurrence, capturing that a smaller size prompt is required by
   * cropping, and print its symbol
   */
  recordCrop(): void {
    this.record("CROP");
  }

  /**
   * Log that a JSON response was mutated to be valid.
   */
  recordJsonMutated(): void {
    this.record("JSON_MUTATED");
  }

  /**
   * Get the currently accumulated statistics of LLM invocation result types.
   * Returns a new immutable snapshot of the statistics.
   */
  getStatusTypesStatistics(includeTotal = false): LLMStatsCategoriesSummary {
    // Build a new snapshot object combining definitions with current counts
    const baseStats = this.buildStatusSnapshot();

    if (includeTotal) {
      const total = this.counts.SUCCESS + this.counts.FAILURE;
      const totalStat: LLMStatsCategoryStatus = {
        description: "Total successes + failures",
        symbol: "=",
        count: total,
      };

      // Return a new object with the TOTAL property
      return {
        ...baseStats,
        TOTAL: totalStat,
      } as LLMStatsCategoriesSummary;
    }

    return baseStats as LLMStatsCategoriesSummary;
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusSummary(): void {
    console.log("LLM invocation event types that will be recorded:");
    console.table(this.getStatusTypesStatistics(), ["description", "symbol"]);
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusDetails(): void {
    console.table(this.getStatusTypesStatistics(true));
  }

  /**
   * Record an event for the specified status key and print its symbol.
   */
  private record(statusKey: keyof LLMStatsCategoriesBase): void {
    this.counts[statusKey]++;
    if (this.shouldPrintEventTicks) {
      console.log(STATUS_DEFINITIONS[statusKey].symbol);
    }
  }

  /**
   * Build a new snapshot of all status statistics by combining immutable definitions
   * with current counts.
   */
  private buildStatusSnapshot(): Record<keyof LLMStatsCategoriesBase, LLMStatsCategoryStatus> {
    const statusKeys = Object.keys(STATUS_DEFINITIONS) as (keyof LLMStatsCategoriesBase)[];
    const snapshot = {} as Record<keyof LLMStatsCategoriesBase, LLMStatsCategoryStatus>;

    for (const key of statusKeys) {
      snapshot[key] = {
        description: STATUS_DEFINITIONS[key].description,
        symbol: STATUS_DEFINITIONS[key].symbol,
        count: this.counts[key],
      };
    }

    return snapshot;
  }
}

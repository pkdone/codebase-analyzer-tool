import { injectable } from "tsyringe";
import {
  LLMStatsCategoryStatus,
  LLMStatsCategoriesSummary,
  LLMStatsCategoriesBase,
} from "../../types/llm.types";

/**
 * Class for accumulating and tracking statistics of LLM invocation result types.
 */
@injectable()
export default class LLMStats {
  // Private fields
  private readonly doPrintEventTicks: boolean;
  private readonly statusTypes: Record<keyof LLMStatsCategoriesBase, LLMStatsCategoryStatus> = {
    SUCCESS: { description: "LLM invocation succeeded", symbol: ">", count: 0 },
    FAILURE: { description: "LLM invocation failed (no data produced)", symbol: "!", count: 0 },
    SWITCH: {
      description: "Switched to secondary LLM to try to process request",
      symbol: "+",
      count: 0,
    },
    OVERLOAD_RETRY: {
      description: "Retried calling LLM due to provider overload or network issue",
      symbol: "?",
      count: 0,
    },
    HOPEFUL_RETRY: {
      description: "Retried calling LLM due to invalid JSON response (a hopeful re-attempt)",
      symbol: "~",
      count: 0,
    },
    CROP: {
      description: "Cropping prompt due to excessive size, before resending",
      symbol: "-",
      count: 0,
    },
  } as const;

  /**
   * Constructor.
   */
  constructor() {
    this.doPrintEventTicks = true;
  }

  /**
   * Log LLM success event occurrence and print its symbol
   */
  recordSuccess() {
    this.record(this.statusTypes.SUCCESS);
  }

  /**
   * Log fLLM ailure event occurrence and print its symbol
   */
  recordFailure() {
    this.record(this.statusTypes.FAILURE);
  }

  /**
   * Log LLM switch event occurrence and print its symbol
   */
  recordSwitch() {
    this.record(this.statusTypes.SWITCH);
  }

  /**
   * Log LLM overload retry event occurrence and print its symbol
   */
  recordOverloadRetry() {
    this.record(this.statusTypes.OVERLOAD_RETRY);
  }

  /**
   * Log LLM invalid JSON retry event occurrence and print its symbol
   */
  recordHopefulRetry() {
    this.record(this.statusTypes.HOPEFUL_RETRY);
  }

  /**
   * Log LLM reactive truncate event occurrence, capturing that a smaller size prompt is required by
   * cropping, and print its symbol
   */
  recordCrop() {
    this.record(this.statusTypes.CROP);
  }

  /**
   * Get the currently accumulated statistics of LLM invocation result types.
   */
  getStatusTypesStatistics(includeTotal = false): LLMStatsCategoriesSummary {
    // Create a mutable copy of the base stats
    const baseStats = structuredClone(this.statusTypes);

    if (includeTotal) {
      const total = baseStats.SUCCESS.count + baseStats.FAILURE.count;
      const totalStat: LLMStatsCategoryStatus = {
        description: "Total successes + failures",
        symbol: "=",
        count: total,
      };

      // Construct the complete object with the TOTAL property
      return {
        ...baseStats,
        TOTAL: totalStat,
      } as LLMStatsCategoriesSummary;
    }

    // Return base stats as summary (TOTAL is optional)
    return baseStats as LLMStatsCategoriesSummary;
  }

  /**
   * Log success event occurrence and print its symbol
   */
  private record(statusType: LLMStatsCategoryStatus) {
    statusType.count++;
    if (this.doPrintEventTicks) console.log(statusType.symbol);
  }
}

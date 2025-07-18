import { injectable } from "tsyringe";
import {
  LLMStatsCategoryStatus,
  LLMStatsCategoriesSummary,
  LLMStatsCategoriesBase,
} from "../../llm.types";

/**
 * Class for accumulating and tracking statistics of LLM invocation result types.
 */
@injectable()
export default class LLMStats {
  // Private fields
  private readonly doPrintEventTicks: boolean;
  private readonly statusTypes: Record<keyof LLMStatsCategoriesBase, LLMStatsCategoryStatus> = {
    SUCCESS: { description: "LLM invocation suceeded", symbol: ">", count: 0 },
    FAILURE: { description: "LLM invocation failed so no data produced", symbol: "!", count: 0 },
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
  recordInvalidRetry() {
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
  getStatusTypesStatistics(includeTotal = false) {
    const tableSnapshot: Record<string, LLMStatsCategoryStatus> = structuredClone(this.statusTypes);

    if (includeTotal) {
      const total = tableSnapshot.SUCCESS.count + tableSnapshot.FAILURE.count;
      tableSnapshot.TOTAL = {
        description: "Total successes + failures",
        symbol: "=",
        count: total,
      };
    }

    return tableSnapshot as unknown as LLMStatsCategoriesSummary;
  }

  /**
   * Log success event occurrence and print its symbol
   */
  private record(statusType: LLMStatsCategoryStatus) {
    statusType.count++;
    if (this.doPrintEventTicks) console.log(statusType.symbol);
  }
}

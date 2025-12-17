import "reflect-metadata";
import { jest, describe, test, expect, beforeEach } from "@jest/globals";
import LLMStats from "../../../../../src/common/llm/tracking/llm-stats";

describe("LLMStats", () => {
  let llmStats: LLMStats;

  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, "log").mockImplementation(() => {
      // Mock implementation
    });
    llmStats = new LLMStats();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Recording Event Types", () => {
    test("should record success events correctly", () => {
      llmStats.recordSuccess();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(1);
      expect(stats.FAILURE.count).toBe(0);
    });

    test("should record failure events correctly", () => {
      llmStats.recordFailure();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(0);
      expect(stats.FAILURE.count).toBe(1);
    });

    test("should record switch events correctly", () => {
      llmStats.recordSwitch();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SWITCH.count).toBe(1);
    });

    test("should record overload retry events correctly", () => {
      llmStats.recordOverloadRetry();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.OVERLOAD_RETRY.count).toBe(1);
    });

    test("should record hopeful retry events correctly", () => {
      llmStats.recordHopefulRetry();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.HOPEFUL_RETRY.count).toBe(1);
    });

    test("should record crop events correctly", () => {
      llmStats.recordCrop();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.CROP.count).toBe(1);
    });

    test("should record JSON mutated events correctly", () => {
      llmStats.recordJsonMutated();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.JSON_MUTATED.count).toBe(1);
    });
  });

  describe("Accumulating Multiple Records", () => {
    test("should accumulate multiple records of the same event type", () => {
      // Record multiple success events
      llmStats.recordSuccess();
      llmStats.recordSuccess();
      llmStats.recordSuccess();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(3);
    });

    test("should accumulate records across different event types", () => {
      llmStats.recordSuccess();
      llmStats.recordFailure();
      llmStats.recordSwitch();
      llmStats.recordOverloadRetry();
      llmStats.recordHopefulRetry();
      llmStats.recordCrop();
      llmStats.recordJsonMutated();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(1);
      expect(stats.FAILURE.count).toBe(1);
      expect(stats.SWITCH.count).toBe(1);
      expect(stats.OVERLOAD_RETRY.count).toBe(1);
      expect(stats.HOPEFUL_RETRY.count).toBe(1);
      expect(stats.CROP.count).toBe(1);
      expect(stats.JSON_MUTATED.count).toBe(1);
    });

    test("should handle complex sequences of events", () => {
      // Simulate a realistic scenario
      llmStats.recordSuccess(); // Initial success
      llmStats.recordOverloadRetry(); // Provider overloaded, retry
      llmStats.recordSuccess(); // Retry succeeded
      llmStats.recordFailure(); // Another request failed
      llmStats.recordSwitch(); // Switch to secondary model
      llmStats.recordSuccess(); // Secondary model succeeded

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(3);
      expect(stats.FAILURE.count).toBe(1);
      expect(stats.SWITCH.count).toBe(1);
      expect(stats.OVERLOAD_RETRY.count).toBe(1);
    });
  });

  describe("Initial State and Edge Cases", () => {
    test("should start with zero counts for all event types", () => {
      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(0);
      expect(stats.FAILURE.count).toBe(0);
      expect(stats.SWITCH.count).toBe(0);
      expect(stats.OVERLOAD_RETRY.count).toBe(0);
      expect(stats.HOPEFUL_RETRY.count).toBe(0);
      expect(stats.CROP.count).toBe(0);
      expect(stats.JSON_MUTATED.count).toBe(0);
    });

    test("should maintain proper descriptions and symbols", () => {
      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.description).toBe("LLM invocation succeeded");
      expect(stats.SUCCESS.symbol).toBe(">");
      expect(stats.FAILURE.description).toBe("LLM invocation failed (no data produced)");
      expect(stats.FAILURE.symbol).toBe("!");
      expect(stats.SWITCH.description).toBe("Switched to fallback LLM to try to process request");
      expect(stats.SWITCH.symbol).toBe("+");
      expect(stats.OVERLOAD_RETRY.description).toBe(
        "Retried calling LLM due to provider overload or network issue",
      );
      expect(stats.OVERLOAD_RETRY.symbol).toBe("?");
      expect(stats.HOPEFUL_RETRY.description).toBe(
        "Retried calling LLM due to invalid JSON response (a hopeful re-attempt)",
      );
      expect(stats.HOPEFUL_RETRY.symbol).toBe("~");
      expect(stats.CROP.description).toBe(
        "Cropping prompt due to excessive size, before resending",
      );
      expect(stats.CROP.symbol).toBe("-");
      expect(stats.JSON_MUTATED.description).toBe(
        "LLM response was mutated to force it to be valid JSON",
      );
      expect(stats.JSON_MUTATED.symbol).toBe("#");
    });
  });

  describe("Realistic Usage Scenarios", () => {
    test("should handle a typical session with mixed results", () => {
      // Simulate a realistic usage pattern
      for (let i = 0; i < 10; i++) {
        llmStats.recordSuccess();
      }

      for (let i = 0; i < 2; i++) {
        llmStats.recordOverloadRetry();
      }

      llmStats.recordSwitch();

      for (let i = 0; i < 3; i++) {
        llmStats.recordHopefulRetry();
      }

      llmStats.recordCrop();
      llmStats.recordFailure();

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(10);
      expect(stats.OVERLOAD_RETRY.count).toBe(2);
      expect(stats.SWITCH.count).toBe(1);
      expect(stats.HOPEFUL_RETRY.count).toBe(3);
      expect(stats.CROP.count).toBe(1);
      expect(stats.FAILURE.count).toBe(1);
    });

    test("should maintain accuracy with high volume of records", () => {
      const expectedCounts = {
        SUCCESS: 100,
        FAILURE: 15,
        SWITCH: 5,
        OVERLOAD_RETRY: 25,
        HOPEFUL_RETRY: 10,
        CROP: 3,
      };

      // Record the expected number of each event type
      for (let i = 0; i < expectedCounts.SUCCESS; i++) {
        llmStats.recordSuccess();
      }

      for (let i = 0; i < expectedCounts.FAILURE; i++) {
        llmStats.recordFailure();
      }

      for (let i = 0; i < expectedCounts.SWITCH; i++) {
        llmStats.recordSwitch();
      }

      for (let i = 0; i < expectedCounts.OVERLOAD_RETRY; i++) {
        llmStats.recordOverloadRetry();
      }

      for (let i = 0; i < expectedCounts.HOPEFUL_RETRY; i++) {
        llmStats.recordHopefulRetry();
      }

      for (let i = 0; i < expectedCounts.CROP; i++) {
        llmStats.recordCrop();
      }

      const stats = llmStats.getStatusTypesStatistics();
      expect(stats.SUCCESS.count).toBe(expectedCounts.SUCCESS);
      expect(stats.FAILURE.count).toBe(expectedCounts.FAILURE);
      expect(stats.SWITCH.count).toBe(expectedCounts.SWITCH);
      expect(stats.OVERLOAD_RETRY.count).toBe(expectedCounts.OVERLOAD_RETRY);
      expect(stats.HOPEFUL_RETRY.count).toBe(expectedCounts.HOPEFUL_RETRY);
      expect(stats.CROP.count).toBe(expectedCounts.CROP);
    });
  });

  describe("Statistics Retrieval", () => {
    test("should return a new object each time to prevent external modification", () => {
      llmStats.recordSuccess();

      const stats1 = llmStats.getStatusTypesStatistics();
      const stats2 = llmStats.getStatusTypesStatistics();

      // Should be equal but not the same object
      expect(stats1).toEqual(stats2);
      expect(stats1).not.toBe(stats2);
    });

    test("should not allow external modification to affect internal state", () => {
      llmStats.recordSuccess();

      const stats = llmStats.getStatusTypesStatistics();
      stats.SUCCESS.count = 999; // Try to modify externally

      // Internal state should remain unchanged
      const newStats = llmStats.getStatusTypesStatistics();
      expect(newStats.SUCCESS.count).toBe(1);
    });

    test("should support optional total calculation", () => {
      llmStats.recordSuccess();
      llmStats.recordSuccess();
      llmStats.recordFailure();

      const statsWithTotal = llmStats.getStatusTypesStatistics(true);
      expect(statsWithTotal.TOTAL).toBeDefined();
      expect(statsWithTotal.TOTAL?.count).toBe(3); // 2 successes + 1 failure
      expect(statsWithTotal.TOTAL?.description).toBe("Total successes + failures");
      expect(statsWithTotal.TOTAL?.symbol).toBe("=");

      const statsWithoutTotal = llmStats.getStatusTypesStatistics(false);
      expect(statsWithoutTotal.TOTAL).toBeUndefined();
    });

    test("should calculate total correctly as sum of success and failure only", () => {
      llmStats.recordSuccess();
      llmStats.recordSuccess();
      llmStats.recordFailure();
      llmStats.recordSwitch(); // Should not count towards total
      llmStats.recordOverloadRetry(); // Should not count towards total

      const statsWithTotal = llmStats.getStatusTypesStatistics(true);
      expect(statsWithTotal.TOTAL?.count).toBe(3); // Only success + failure
    });
  });

  describe("Console Output", () => {
    test("should print symbols when events are recorded", () => {
      const consoleSpy = jest.spyOn(console, "log");

      llmStats.recordSuccess();
      llmStats.recordFailure();
      llmStats.recordSwitch();

      expect(consoleSpy).toHaveBeenCalledWith(">");
      expect(consoleSpy).toHaveBeenCalledWith("!");
      expect(consoleSpy).toHaveBeenCalledWith("+");
      expect(consoleSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe("displayLLMStatusSummary", () => {
    test("should display LLM status summary", () => {
      const mockLog = jest.fn();
      const mockTable = jest.fn();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(mockLog);
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      llmStats.displayLLMStatusSummary();

      expect(consoleSpy).toHaveBeenCalledWith("LLM invocation event types that will be recorded:");
      expect(consoleTableSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleTableSpy.mockRestore();
    });
  });

  describe("displayLLMStatusDetails", () => {
    test("should display LLM status details", () => {
      const mockTable = jest.fn();
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      llmStats.displayLLMStatusDetails();

      expect(consoleTableSpy).toHaveBeenCalledWith(expect.any(Object));

      consoleTableSpy.mockRestore();
    });
  });
});

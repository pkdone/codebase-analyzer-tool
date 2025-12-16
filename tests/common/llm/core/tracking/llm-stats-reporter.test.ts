import { LLMStatsReporter } from "../../../../../src/common/llm/tracking/llm-stats-reporter";
import LLMStats from "../../../../../src/common/llm/tracking/llm-stats";

describe("LLMStatsReporter", () => {
  let llmStatsReporter: LLMStatsReporter;
  let llmStats: LLMStats;

  beforeEach(() => {
    // Create instances using factory pattern (no DI container)
    llmStats = new LLMStats();
    llmStatsReporter = new LLMStatsReporter(llmStats);
  });

  describe("displayLLMStatusSummary", () => {
    test("should display LLM status summary", () => {
      const mockLog = jest.fn();
      const mockTable = jest.fn();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(mockLog);
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      llmStatsReporter.displayLLMStatusSummary();

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

      llmStatsReporter.displayLLMStatusDetails();

      expect(consoleTableSpy).toHaveBeenCalledWith(expect.any(Object));

      consoleTableSpy.mockRestore();
    });
  });
});

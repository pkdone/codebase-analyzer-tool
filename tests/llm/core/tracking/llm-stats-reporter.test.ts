import "reflect-metadata";
import { container } from "tsyringe";
import { LLMStatsReporter } from "../../../../src/llm/core/tracking/llm-stats-reporter";
import LLMStats from "../../../../src/llm/core/tracking/llm-stats";
import { TOKENS } from "../../../../src/di/tokens";

describe("LLMStatsReporter", () => {
  let llmStatsReporter: LLMStatsReporter;
  let llmStats: LLMStats;

  beforeEach(() => {
    // Clear the container and register fresh instances
    container.clearInstances();
    llmStats = new LLMStats();
    container.registerInstance(TOKENS.LLMStats, llmStats);
    llmStatsReporter = container.resolve(LLMStatsReporter);
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe("displayLLMStatusSummary", () => {
    test("should display LLM status summary", () => {
      const mockLog = jest.fn();
      const mockTable = jest.fn();
      const consoleSpy = jest.spyOn(console, "log").mockImplementation(mockLog);
      const consoleTableSpy = jest.spyOn(console, "table").mockImplementation(mockTable);

      llmStatsReporter.displayLLMStatusSummary();

      expect(consoleSpy).toHaveBeenCalledWith("LLM inovocation event types that will be recorded:");
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
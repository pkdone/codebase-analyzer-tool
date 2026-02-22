import "reflect-metadata";
import {
  InsightsCompletionExecutor,
  InsightCompletionOptions,
} from "../../../../../src/app/components/insights/strategies/insights-completion-executor";

describe("insight-completion.service", () => {
  describe("InsightsCompletionExecutor", () => {
    it("should export InsightsCompletionExecutor as a class", () => {
      expect(typeof InsightsCompletionExecutor).toBe("function");
      expect(InsightsCompletionExecutor.prototype).toBeDefined();
      expect(InsightsCompletionExecutor.prototype.constructor).toBe(InsightsCompletionExecutor);
    });

    it("should have an execute method on its prototype", () => {
      expect(typeof InsightsCompletionExecutor.prototype.execute).toBe("function");
    });

    it("should have correct execute method signature", () => {
      expect(InsightsCompletionExecutor.prototype.execute.length).toBe(3); // Takes 3 parameters: category, summaries, options?
    });

    describe("InsightCompletionOptions interface", () => {
      it("should allow optional forPartialAnalysis", () => {
        const options: InsightCompletionOptions = {
          forPartialAnalysis: true,
        };
        expect(options.forPartialAnalysis).toBe(true);
      });

      it("should allow optional taskCategory", () => {
        const options: InsightCompletionOptions = {
          taskCategory: "test-category",
        };
        expect(options.taskCategory).toBe("test-category");
      });
    });
  });
});

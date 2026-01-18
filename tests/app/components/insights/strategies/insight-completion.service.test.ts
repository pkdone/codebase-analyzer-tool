import {
  executeInsightCompletion,
  InsightCompletionOptions,
} from "../../../../../src/app/components/insights/strategies/insights-completion-executor";

describe("insight-completion.service", () => {
  describe("executeInsightCompletion", () => {
    it("should export executeInsightCompletion function", () => {
      expect(typeof executeInsightCompletion).toBe("function");
    });

    it("should have correct function signature", () => {
      expect(executeInsightCompletion.length).toBe(4); // Takes 4 required parameters
      // Note: The function no longer uses a generic type parameter.
      // Return type is now inferred from the category's response schema.
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

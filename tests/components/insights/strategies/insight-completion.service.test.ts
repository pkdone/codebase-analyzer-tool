import {
  executeInsightCompletion,
  InsightCompletionOptions,
} from "../../../../src/components/insights/strategies/insight-completion.service";

describe("insight-completion.service", () => {
  describe("executeInsightCompletion", () => {
    it("should export executeInsightCompletion function", () => {
      expect(typeof executeInsightCompletion).toBe("function");
    });

    it("should have correct function signature", () => {
      expect(executeInsightCompletion.length).toBe(3); // Takes 3 required parameters
    });

    describe("InsightCompletionOptions interface", () => {
      it("should allow optional partialAnalysisNote", () => {
        const options: InsightCompletionOptions = {
          partialAnalysisNote: "test note",
        };
        expect(options.partialAnalysisNote).toBe("test note");
      });

      it("should allow optional taskCategory", () => {
        const options: InsightCompletionOptions = {
          taskCategory: "test-category",
        };
        expect(options.taskCategory).toBe("test-category");
      });

      it("should allow empty options object", () => {
        const options: InsightCompletionOptions = {};
        expect(options).toBeDefined();
      });
    });
  });
});

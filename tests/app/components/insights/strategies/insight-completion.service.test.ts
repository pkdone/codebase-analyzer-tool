import {
  executeInsightCompletion,
  InsightCompletionOptions,
} from "../../../../../src/app/components/insights/strategies/insights-completion-executor";
import { ANALYSIS_PROMPT_TEMPLATE } from "../../../../../src/app/prompts/app-templates";

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
      it("should require template", () => {
        const options: InsightCompletionOptions = {
          template: ANALYSIS_PROMPT_TEMPLATE,
        };
        expect(options.template).toBe(ANALYSIS_PROMPT_TEMPLATE);
      });

      it("should allow optional taskCategory", () => {
        const options: InsightCompletionOptions = {
          template: ANALYSIS_PROMPT_TEMPLATE,
          taskCategory: "test-category",
        };
        expect(options.taskCategory).toBe("test-category");
      });
    });
  });
});

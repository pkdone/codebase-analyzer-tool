import "reflect-metadata";
import { container } from "tsyringe";
import { insightsTokens } from "../../../../src/app/di/tokens";
import { registerInsightsComponents } from "../../../../src/app/di/registration-modules/insights-registration";

describe("Insights Registration Module", () => {
  beforeEach(() => {
    container.clearInstances();
    container.reset();
  });

  describe("registerInsightsComponents", () => {
    it("should register all insights components as singletons", () => {
      registerInsightsComponents();

      expect(container.isRegistered(insightsTokens.PromptFileInsightsGenerator)).toBe(true);
      expect(container.isRegistered(insightsTokens.InsightsFromDBGenerator)).toBe(true);
      expect(container.isRegistered(insightsTokens.InsightsFromRawCodeGenerator)).toBe(true);
      expect(container.isRegistered(insightsTokens.InsightsProcessorSelector)).toBe(true);
    });

    it("should register components only once even on multiple calls", () => {
      registerInsightsComponents();
      const isRegistered1 = container.isRegistered(insightsTokens.InsightsFromDBGenerator);

      registerInsightsComponents();
      const isRegistered2 = container.isRegistered(insightsTokens.InsightsFromDBGenerator);

      expect(isRegistered1).toBe(true);
      expect(isRegistered2).toBe(true);
    });

    it("should log registration message", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      registerInsightsComponents();

      expect(consoleSpy).toHaveBeenCalledWith("Insights components registered");
      consoleSpy.mockRestore();
    });
  });
});

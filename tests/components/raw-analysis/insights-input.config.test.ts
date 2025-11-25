import { insightsInputConfig } from "../../../src/components/raw-analysis/insights-input.config";

describe("insightsInputConfig", () => {
  describe("input file paths", () => {
    it("should have REQUIREMENTS_PROMPTS_FOLDERPATH defined", () => {
      expect(insightsInputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBeDefined();
      expect(insightsInputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBe("./input/requirements");
    });

    it("should have REQUIREMENTS_FILE_REGEX defined", () => {
      expect(insightsInputConfig.REQUIREMENTS_FILE_REGEX).toBeDefined();
      expect(insightsInputConfig.REQUIREMENTS_FILE_REGEX).toBeInstanceOf(RegExp);
    });

    it("should match requirement files with REQUIREMENTS_FILE_REGEX", () => {
      expect(insightsInputConfig.REQUIREMENTS_FILE_REGEX.test("requirement00.prompt")).toBe(true);
      expect(insightsInputConfig.REQUIREMENTS_FILE_REGEX.test("requirement99.prompt")).toBe(true);
      expect(insightsInputConfig.REQUIREMENTS_FILE_REGEX.test("REQUIREMENT10.PROMPT")).toBe(true);
      expect(insightsInputConfig.REQUIREMENTS_FILE_REGEX.test("requirement.txt")).toBe(false);
      expect(insightsInputConfig.REQUIREMENTS_FILE_REGEX.test("other.prompt")).toBe(false);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = insightsInputConfig;
      expect(config).toHaveProperty("REQUIREMENTS_PROMPTS_FOLDERPATH");
      expect(config).toHaveProperty("REQUIREMENTS_FILE_REGEX");
    });
  });
});

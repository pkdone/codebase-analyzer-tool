import { inputConfig } from "../../../../src/app/prompts/config/input.config";

describe("inputConfig", () => {
  describe("input file paths", () => {
    it("should have REQUIREMENTS_PROMPTS_FOLDERPATH defined", () => {
      expect(inputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBeDefined();
      expect(inputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBe("./input/requirements");
    });

    it("should have REQUIREMENTS_FILE_REGEX defined", () => {
      expect(inputConfig.REQUIREMENTS_FILE_REGEX).toBeDefined();
      expect(inputConfig.REQUIREMENTS_FILE_REGEX).toBeInstanceOf(RegExp);
    });

    it("should match requirement files with REQUIREMENTS_FILE_REGEX", () => {
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement00.prompt")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement99.prompt")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("REQUIREMENT10.PROMPT")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement.txt")).toBe(false);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("other.prompt")).toBe(false);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = inputConfig;
      expect(config).toHaveProperty("BASE_PATH");
      expect(config).toHaveProperty("QUESTIONS_PROMPTS_FILEPATH");
      expect(config).toHaveProperty("REQUIREMENTS_PROMPTS_FOLDERPATH");
      expect(config).toHaveProperty("REQUIREMENTS_FILE_REGEX");
    });
  });
});

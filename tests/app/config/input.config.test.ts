import { inputConfig } from "../../../src/app/config/input.config";

describe("inputConfig", () => {
  describe("base path", () => {
    it("should have BASE_PATH defined", () => {
      expect(inputConfig.BASE_PATH).toBeDefined();
      expect(inputConfig.BASE_PATH).toBe("./input");
    });
  });

  describe("input file paths", () => {
    it("should have QUESTIONS_PROMPTS_FILEPATH defined", () => {
      expect(inputConfig.QUESTIONS_PROMPTS_FILEPATH).toBeDefined();
      expect(inputConfig.QUESTIONS_PROMPTS_FILEPATH).toBe("./input/questions.prompts");
    });

    it("should have REQUIREMENTS_PROMPTS_FOLDERPATH defined", () => {
      expect(inputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBeDefined();
      expect(inputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toBe("./input/requirements");
    });

    it("should have REQUIREMENTS_FILE_REGEX defined", () => {
      expect(inputConfig.REQUIREMENTS_FILE_REGEX).toBeDefined();
      expect(inputConfig.REQUIREMENTS_FILE_REGEX).toBeInstanceOf(RegExp);
    });
  });

  describe("requirements file regex", () => {
    it("should match requirement files with REQUIREMENTS_FILE_REGEX", () => {
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement00.prompt")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement99.prompt")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("REQUIREMENT10.PROMPT")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement.txt")).toBe(false);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("other.prompt")).toBe(false);
    });
  });

  describe("path consistency", () => {
    it("should have QUESTIONS_PROMPTS_FILEPATH under BASE_PATH", () => {
      expect(inputConfig.QUESTIONS_PROMPTS_FILEPATH).toContain(inputConfig.BASE_PATH);
    });

    it("should have REQUIREMENTS_PROMPTS_FOLDERPATH under BASE_PATH", () => {
      expect(inputConfig.REQUIREMENTS_PROMPTS_FOLDERPATH).toContain(inputConfig.BASE_PATH);
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

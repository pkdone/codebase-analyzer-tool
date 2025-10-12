import { inputConfig } from "../../src/components/querying/config/input.config";

describe("inputConfig", () => {
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

    it("should match requirement files with REQUIREMENTS_FILE_REGEX", () => {
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement00.prompt")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement99.prompt")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("REQUIREMENT10.PROMPT")).toBe(true);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("requirement.txt")).toBe(false);
      expect(inputConfig.REQUIREMENTS_FILE_REGEX.test("other.prompt")).toBe(false);
    });
  });

  describe("vector search configuration", () => {
    it("should have VECTOR_SEARCH_NUM_CANDIDATES defined", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeDefined();
      expect(inputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBe(150);
    });

    it("should have VECTOR_SEARCH_NUM_LIMIT defined", () => {
      expect(inputConfig.VECTOR_SEARCH_NUM_LIMIT).toBeDefined();
      expect(inputConfig.VECTOR_SEARCH_NUM_LIMIT).toBe(6);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = inputConfig;
      expect(config).toHaveProperty("QUESTIONS_PROMPTS_FILEPATH");
      expect(config).toHaveProperty("REQUIREMENTS_PROMPTS_FOLDERPATH");
      expect(config).toHaveProperty("REQUIREMENTS_FILE_REGEX");
      expect(config).toHaveProperty("VECTOR_SEARCH_NUM_CANDIDATES");
      expect(config).toHaveProperty("VECTOR_SEARCH_NUM_LIMIT");
    });
  });
});

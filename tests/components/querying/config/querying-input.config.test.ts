import { queryingInputConfig } from "../../../../src/components/querying/config/querying-input.config";

describe("queryingInputConfig", () => {
  describe("input file paths", () => {
    it("should have QUESTIONS_PROMPTS_FILEPATH defined", () => {
      expect(queryingInputConfig.QUESTIONS_PROMPTS_FILEPATH).toBeDefined();
      expect(queryingInputConfig.QUESTIONS_PROMPTS_FILEPATH).toBe("./input/questions.prompts");
    });
  });

  describe("vector search configuration", () => {
    it("should have VECTOR_SEARCH_NUM_CANDIDATES defined", () => {
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeDefined();
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBe(150);
    });

    it("should have VECTOR_SEARCH_NUM_LIMIT defined", () => {
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_LIMIT).toBeDefined();
      expect(queryingInputConfig.VECTOR_SEARCH_NUM_LIMIT).toBe(6);
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = queryingInputConfig;
      expect(config).toHaveProperty("QUESTIONS_PROMPTS_FILEPATH");
      expect(config).toHaveProperty("VECTOR_SEARCH_NUM_CANDIDATES");
      expect(config).toHaveProperty("VECTOR_SEARCH_NUM_LIMIT");
    });
  });
});

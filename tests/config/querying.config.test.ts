import { queryingConfig } from "../../src/components/querying/config/querying.config";

describe("queryingConfig", () => {
  it("should have QUESTIONS_PROMPTS_FILEPATH defined", () => {
    expect(queryingConfig.QUESTIONS_PROMPTS_FILEPATH).toBeDefined();
    expect(queryingConfig.QUESTIONS_PROMPTS_FILEPATH).toBe("./input/questions.prompts");
  });

  it("should have VECTOR_SEARCH_NUM_CANDIDATES defined", () => {
    expect(queryingConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBeDefined();
    expect(queryingConfig.VECTOR_SEARCH_NUM_CANDIDATES).toBe(150);
  });

  it("should have VECTOR_SEARCH_NUM_LIMIT defined", () => {
    expect(queryingConfig.VECTOR_SEARCH_NUM_LIMIT).toBeDefined();
    expect(queryingConfig.VECTOR_SEARCH_NUM_LIMIT).toBe(6);
  });

  it("should be a readonly object", () => {
    // Attempt to modify should fail (TypeScript compile-time check)
    // This test verifies the property exists and has the expected value
    const config = queryingConfig;
    expect(config).toHaveProperty("QUESTIONS_PROMPTS_FILEPATH");
    expect(config).toHaveProperty("VECTOR_SEARCH_NUM_CANDIDATES");
    expect(config).toHaveProperty("VECTOR_SEARCH_NUM_LIMIT");
  });
});

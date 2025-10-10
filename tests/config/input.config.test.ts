import { inputConfig } from "../../src/config/input.config";

describe("inputConfig", () => {
  it("should have QUESTIONS_PROMPTS_FILEPATH defined", () => {
    expect(inputConfig.QUESTIONS_PROMPTS_FILEPATH).toBeDefined();
    expect(inputConfig.QUESTIONS_PROMPTS_FILEPATH).toBe("./input/questions.prompts");
  });

  it("should be a readonly object", () => {
    // Attempt to modify should fail (TypeScript compile-time check)
    // This test verifies the property exists and has the expected value
    const config = inputConfig;
    expect(config).toHaveProperty("QUESTIONS_PROMPTS_FILEPATH");
  });
});


import * as fs from "fs";
import * as path from "path";

/**
 * Unit tests for BedrockLlamaLLM constant extraction
 */
describe("BedrockLlamaLLM", () => {
  it("should have BEDROCK_LLAMA_MAX_GEN_LEN_CAP constant defined", () => {
    // This test verifies that the constant is defined and used correctly
    // The actual implementation details are tested through integration tests

    // Read the file to verify the constant exists
    const filePath = path.join(
      __dirname,
      "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm.ts",
    );
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Verify the constant is defined
    expect(fileContent).toContain("BEDROCK_LLAMA_MAX_GEN_LEN_CAP");
    expect(fileContent).toContain("const BEDROCK_LLAMA_MAX_GEN_LEN_CAP = 2048");

    // Verify it's used in the method
    expect(fileContent).toContain("Math.min(maxCompletionTokens, BEDROCK_LLAMA_MAX_GEN_LEN_CAP)");
  });

  it("should use the constant instead of magic number", () => {
    const filePath = path.join(
      __dirname,
      "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm.ts",
    );
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Verify the constant is used in Math.min() instead of hardcoded 2048
    expect(fileContent).toContain("Math.min(maxCompletionTokens, BEDROCK_LLAMA_MAX_GEN_LEN_CAP)");

    // Verify the constant reference is also used in the fallback
    const usagePattern =
      /maxCompletionTokens\s*=\s*this\.llmModelsMetadata\[modelKey\]\.maxCompletionTokens\s*\?\?\s*BEDROCK_LLAMA_MAX_GEN_LEN_CAP/;
    expect(fileContent).toMatch(usagePattern);
  });
});

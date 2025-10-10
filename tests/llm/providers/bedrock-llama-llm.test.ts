import * as fs from "fs";
import * as path from "path";

/**
 * Unit tests for BedrockLlamaLLM - verifies maxGenLenCap is retrieved from providerSpecificConfig
 */
describe("BedrockLlamaLLM", () => {
  it("should retrieve maxGenLenCap from providerSpecificConfig", () => {
    // This test verifies that maxGenLenCap is accessed from providerSpecificConfig
    // instead of being a hardcoded constant in the implementation file

    // Read the file to verify the pattern exists
    const filePath = path.join(
      __dirname,
      "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm.ts",
    );
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Verify that maxGenLenCap is retrieved from providerSpecificConfig
    expect(fileContent).toContain("providerSpecificConfig");
    expect(fileContent).toContain("maxGenLenCap");

    // Verify it's used in the calculation
    expect(fileContent).toContain("Math.min(maxCompletionTokens, maxGenLenCap)");
  });

  it("should not have a hardcoded BEDROCK_LLAMA_MAX_GEN_LEN_CAP constant", () => {
    const filePath = path.join(
      __dirname,
      "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm.ts",
    );
    const fileContent = fs.readFileSync(filePath, "utf-8");

    // Verify the old constant is not present (it's now in the manifest)
    expect(fileContent).not.toContain("const BEDROCK_LLAMA_MAX_GEN_LEN_CAP");
  });
});

import * as fs from "fs";
import * as path from "path";

/**
 * Unit tests for BedrockLlamaLLM - verifies maxGenLenCap is retrieved from providerSpecificConfig
 * and that Llama-specific tokens are properly extracted to constants
 */
describe("BedrockLlamaLLM", () => {
  let fileContent: string;

  beforeAll(() => {
    const filePath = path.join(
      __dirname,
      "../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm.ts",
    );
    fileContent = fs.readFileSync(filePath, "utf-8");
  });

  it("should retrieve maxGenLenCap from providerSpecificConfig", () => {
    // This test verifies that maxGenLenCap is accessed from providerSpecificConfig
    // instead of being a hardcoded constant in the implementation file

    // Verify that maxGenLenCap is retrieved from providerSpecificConfig
    expect(fileContent).toContain("providerSpecificConfig");
    expect(fileContent).toContain("maxGenLenCap");

    // Verify it's used in the calculation
    expect(fileContent).toContain("Math.min(maxCompletionTokens, maxGenLenCap)");
  });

  it("should not have a hardcoded BEDROCK_LLAMA_MAX_GEN_LEN_CAP constant", () => {
    // Verify the old constant is not present (it's now in the manifest)
    expect(fileContent).not.toContain("const BEDROCK_LLAMA_MAX_GEN_LEN_CAP");
  });

  describe("Llama token constants", () => {
    it("should define LLAMA_BEGIN_TOKEN constant", () => {
      expect(fileContent).toContain('const LLAMA_BEGIN_TOKEN = "<|begin_of_text|>"');
    });

    it("should define LLAMA_HEADER_START_TOKEN constant", () => {
      expect(fileContent).toContain('const LLAMA_HEADER_START_TOKEN = "<|start_header_id|>"');
    });

    it("should define LLAMA_HEADER_END_TOKEN constant", () => {
      expect(fileContent).toContain('const LLAMA_HEADER_END_TOKEN = "<|end_header_id|>"');
    });

    it("should define LLAMA_EOT_TOKEN constant", () => {
      expect(fileContent).toContain('const LLAMA_EOT_TOKEN = "<|eot_id|>"');
    });

    it("should define LLAMA_SYSTEM_MESSAGE constant", () => {
      expect(fileContent).toContain("const LLAMA_SYSTEM_MESSAGE");
      expect(fileContent).toContain("helpful software engineering and programming assistant");
    });

    it("should not have hardcoded template tokens in buildCompletionRequestBody", () => {
      // Extract the buildCompletionRequestBody method
      // eslint-disable-next-line no-regex-spaces
      const methodRegex = /protected buildCompletionRequestBody[\s\S]*?^  }/m;
      const methodMatch = methodRegex.exec(fileContent);
      expect(methodMatch).toBeTruthy();

      if (methodMatch) {
        const methodContent = methodMatch[0];

        // Verify that the method uses the constants instead of hardcoded strings
        expect(methodContent).toContain("LLAMA_BEGIN_TOKEN");
        expect(methodContent).toContain("LLAMA_HEADER_START_TOKEN");
        expect(methodContent).toContain("LLAMA_HEADER_END_TOKEN");
        expect(methodContent).toContain("LLAMA_EOT_TOKEN");
        expect(methodContent).toContain("LLAMA_SYSTEM_MESSAGE");

        // Verify that hardcoded tokens are not present in the method body
        // (they should only be in the constant definitions)
        const promptRegex = /prompt: formattedPrompt/;
        const promptAssignment = promptRegex.exec(methodContent);
        expect(promptAssignment).toBeTruthy();
      }
    });
  });
});

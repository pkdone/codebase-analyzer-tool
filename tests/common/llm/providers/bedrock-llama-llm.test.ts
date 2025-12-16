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
      "../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm.ts",
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
    it("should not import bedrockLlamaConfig", () => {
      expect(fileContent).not.toContain(
        'import { bedrockLlamaConfig } from "./bedrock-llama.config"',
      );
    });

    it("should define local LLAMA constants in the file", () => {
      expect(fileContent).toContain("const LLAMA_BEGIN_TOKEN");
      expect(fileContent).toContain("const LLAMA_HEADER_START_TOKEN");
      expect(fileContent).toContain("const LLAMA_HEADER_END_TOKEN");
      expect(fileContent).toContain("const LLAMA_EOT_TOKEN");
      expect(fileContent).toContain("const LLAMA_SYSTEM_MESSAGE");
    });

    it("should use local LLAMA constants in buildCompletionRequestBody", () => {
      expect(fileContent).toContain("LLAMA_BEGIN_TOKEN");
      expect(fileContent).toContain("LLAMA_HEADER_START_TOKEN");
      expect(fileContent).toContain("LLAMA_HEADER_END_TOKEN");
      expect(fileContent).toContain("LLAMA_EOT_TOKEN");
      expect(fileContent).toContain("LLAMA_SYSTEM_MESSAGE");
    });

    it("should not have hardcoded template tokens in buildCompletionRequestBody", () => {
      // Extract the buildCompletionRequestBody method
      // eslint-disable-next-line no-regex-spaces
      const methodRegex = /protected buildCompletionRequestBody[\s\S]*?^  }/m;
      const methodMatch = methodRegex.exec(fileContent);
      expect(methodMatch).toBeTruthy();

      if (methodMatch) {
        const methodContent = methodMatch[0];

        // Verify that the method uses inlined constants instead of hardcoded strings
        expect(methodContent).toContain("LLAMA_BEGIN_TOKEN");
        expect(methodContent).toContain("LLAMA_HEADER_START_TOKEN");
        expect(methodContent).toContain("LLAMA_HEADER_END_TOKEN");
        expect(methodContent).toContain("LLAMA_EOT_TOKEN");
        expect(methodContent).toContain("LLAMA_SYSTEM_MESSAGE");

        // Verify that hardcoded tokens are not present in the method body
        expect(methodContent).not.toContain('"<|begin_of_text|>"');
        expect(methodContent).not.toContain('"<|start_header_id|>"');
        expect(methodContent).not.toContain('"<|end_header_id|>"');
        expect(methodContent).not.toContain('"<|eot_id|>"');
      }
    });
  });
});

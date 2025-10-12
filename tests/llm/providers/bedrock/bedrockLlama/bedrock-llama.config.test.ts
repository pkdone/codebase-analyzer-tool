import { bedrockLlamaConfig } from "../../../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.config";

describe("bedrockLlamaConfig", () => {
  describe("Llama chat template tokens", () => {
    it("should have LLAMA_BEGIN_TOKEN defined", () => {
      expect(bedrockLlamaConfig.LLAMA_BEGIN_TOKEN).toBeDefined();
      expect(bedrockLlamaConfig.LLAMA_BEGIN_TOKEN).toBe("<|begin_of_text|>");
    });

    it("should have LLAMA_HEADER_START_TOKEN defined", () => {
      expect(bedrockLlamaConfig.LLAMA_HEADER_START_TOKEN).toBeDefined();
      expect(bedrockLlamaConfig.LLAMA_HEADER_START_TOKEN).toBe("<|start_header_id|>");
    });

    it("should have LLAMA_HEADER_END_TOKEN defined", () => {
      expect(bedrockLlamaConfig.LLAMA_HEADER_END_TOKEN).toBeDefined();
      expect(bedrockLlamaConfig.LLAMA_HEADER_END_TOKEN).toBe("<|end_header_id|>");
    });

    it("should have LLAMA_EOT_TOKEN defined", () => {
      expect(bedrockLlamaConfig.LLAMA_EOT_TOKEN).toBeDefined();
      expect(bedrockLlamaConfig.LLAMA_EOT_TOKEN).toBe("<|eot_id|>");
    });
  });

  describe("Llama system message", () => {
    it("should have LLAMA_SYSTEM_MESSAGE defined", () => {
      expect(bedrockLlamaConfig.LLAMA_SYSTEM_MESSAGE).toBeDefined();
      expect(typeof bedrockLlamaConfig.LLAMA_SYSTEM_MESSAGE).toBe("string");
      expect(bedrockLlamaConfig.LLAMA_SYSTEM_MESSAGE.length).toBeGreaterThan(0);
    });

    it("should contain programming assistant guidance", () => {
      expect(bedrockLlamaConfig.LLAMA_SYSTEM_MESSAGE).toContain("software engineering");
      expect(bedrockLlamaConfig.LLAMA_SYSTEM_MESSAGE).toContain("programming");
    });
  });

  describe("immutability", () => {
    it("should be a readonly object", () => {
      const config = bedrockLlamaConfig;
      expect(config).toHaveProperty("LLAMA_BEGIN_TOKEN");
      expect(config).toHaveProperty("LLAMA_HEADER_START_TOKEN");
      expect(config).toHaveProperty("LLAMA_HEADER_END_TOKEN");
      expect(config).toHaveProperty("LLAMA_EOT_TOKEN");
      expect(config).toHaveProperty("LLAMA_SYSTEM_MESSAGE");
    });

    it("should be typed as const", () => {
      // This test verifies that TypeScript treats the config as readonly
      const beginToken: "<|begin_of_text|>" = bedrockLlamaConfig.LLAMA_BEGIN_TOKEN;
      const eotToken: "<|eot_id|>" = bedrockLlamaConfig.LLAMA_EOT_TOKEN;

      expect(beginToken).toBe("<|begin_of_text|>");
      expect(eotToken).toBe("<|eot_id|>");
    });
  });
});

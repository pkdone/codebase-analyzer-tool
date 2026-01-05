import { bedrockLlamaProviderManifest } from "../../../src/common/llm/providers/bedrock/llama/bedrock-llama.manifest";

describe("bedrockLlamaProviderManifest", () => {
  describe("providerSpecificConfig", () => {
    it("should have maxGenLenCap in providerSpecificConfig", () => {
      expect(bedrockLlamaProviderManifest.providerSpecificConfig).toBeDefined();
      expect(
        (
          bedrockLlamaProviderManifest.providerSpecificConfig as unknown as {
            maxGenLenCap: number;
          }
        ).maxGenLenCap,
      ).toBeDefined();
    });

    it("should have maxGenLenCap set to 2048", () => {
      const config = bedrockLlamaProviderManifest.providerSpecificConfig as unknown as {
        maxGenLenCap: number;
      };
      expect(config.maxGenLenCap).toBe(2048);
    });

    it("should maintain other required providerSpecificConfig properties", () => {
      const config = bedrockLlamaProviderManifest.providerSpecificConfig as unknown as {
        requestTimeoutMillis: number;
        maxRetryAttempts: number;
        minRetryDelayMillis: number;
        maxRetryDelayMillis: number;
        maxGenLenCap: number;
      };

      expect(config.requestTimeoutMillis).toBe(8 * 60 * 1000);
      expect(config.maxRetryAttempts).toBe(4);
      expect(config.minRetryDelayMillis).toBe(25 * 1000);
      expect(config.maxRetryDelayMillis).toBe(240 * 1000);
    });
  });

  describe("manifest structure", () => {
    it("should have all required top-level properties", () => {
      expect(bedrockLlamaProviderManifest.providerName).toBe("Bedrock Llama");
      expect(bedrockLlamaProviderManifest.modelFamily).toBe("BedrockLlama");
      expect(bedrockLlamaProviderManifest.envSchema).toBeDefined();
      expect(bedrockLlamaProviderManifest.models).toBeDefined();
      expect(bedrockLlamaProviderManifest.errorPatterns).toBeDefined();
      expect(bedrockLlamaProviderManifest.implementation).toBeDefined();
    });
  });
});

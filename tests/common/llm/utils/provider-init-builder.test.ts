import { jest, describe, it, expect } from "@jest/globals";
import {
  buildModelsMetadataFromChain,
  getCompletionModelKeysFromChain,
  getEmbeddingModelKeysFromChain,
} from "../../../../src/common/llm/utils/provider-init-builder";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import type { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import type { ResolvedModelChain } from "../../../../src/common/llm/config/llm-module-config.types";
import { z } from "zod";

// Helper to create minimal manifest for testing
function createTestManifest(
  providerFamily: string,
  embeddings: { modelKey: string; dimensions?: number; maxTotalTokens: number }[],
  completions: { modelKey: string; maxCompletionTokens: number; maxTotalTokens: number }[],
): LLMProviderManifest {
  return {
    providerFamily,
    envSchema: z.object({}),
    models: {
      embeddings: embeddings.map((e) => ({
        modelKey: e.modelKey,
        urnEnvKey: `${e.modelKey.toUpperCase()}_URN`,
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: e.dimensions ?? 1536,
        maxTotalTokens: e.maxTotalTokens,
      })),
      completions: completions.map((c) => ({
        modelKey: c.modelKey,
        urnEnvKey: `${c.modelKey.toUpperCase()}_URN`,
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: c.maxCompletionTokens,
        maxTotalTokens: c.maxTotalTokens,
      })),
    },
    errorPatterns: [],
    providerSpecificConfig: {
      requestTimeoutMillis: 60000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    },
    implementation: jest.fn() as unknown as LLMProviderManifest["implementation"],
  };
}

describe("provider-init-builder", () => {
  describe("buildModelsMetadataFromChain", () => {
    it("should build metadata for models referenced in the chain", () => {
      const manifest = createTestManifest(
        "TestProvider",
        [{ modelKey: "embed-model", dimensions: 1536, maxTotalTokens: 8192 }],
        [
          { modelKey: "comp-model-1", maxCompletionTokens: 4096, maxTotalTokens: 128000 },
          { modelKey: "comp-model-2", maxCompletionTokens: 2048, maxTotalTokens: 64000 },
        ],
      );

      const modelChain: ResolvedModelChain = {
        embeddings: [
          { providerFamily: "TestProvider", modelKey: "embed-model", modelUrn: "embed-urn-value" },
        ],
        completions: [
          { providerFamily: "TestProvider", modelKey: "comp-model-1", modelUrn: "comp1-urn-value" },
          { providerFamily: "TestProvider", modelKey: "comp-model-2", modelUrn: "comp2-urn-value" },
        ],
      };

      const result = buildModelsMetadataFromChain(manifest, modelChain);

      // Check embedding model
      expect(result["embed-model"]).toBeDefined();
      expect(result["embed-model"].modelKey).toBe("embed-model");
      expect(result["embed-model"].urn).toBe("embed-urn-value");
      expect(result["embed-model"].purpose).toBe(LLMPurpose.EMBEDDINGS);
      expect(result["embed-model"].dimensions).toBe(1536);

      // Check completion models
      expect(result["comp-model-1"]).toBeDefined();
      expect(result["comp-model-1"].modelKey).toBe("comp-model-1");
      expect(result["comp-model-1"].urn).toBe("comp1-urn-value");
      expect(result["comp-model-1"].purpose).toBe(LLMPurpose.COMPLETIONS);
      expect(result["comp-model-1"].maxCompletionTokens).toBe(4096);

      expect(result["comp-model-2"]).toBeDefined();
      expect(result["comp-model-2"].modelKey).toBe("comp-model-2");
      expect(result["comp-model-2"].urn).toBe("comp2-urn-value");
    });

    it("should only include models from the chain for this provider", () => {
      const manifest = createTestManifest(
        "TestProvider",
        [{ modelKey: "embed-model", maxTotalTokens: 8192 }],
        [{ modelKey: "comp-model", maxCompletionTokens: 4096, maxTotalTokens: 128000 }],
      );

      // Chain includes models from another provider
      const modelChain: ResolvedModelChain = {
        embeddings: [
          { providerFamily: "OtherProvider", modelKey: "other-embed", modelUrn: "other-embed-urn" },
          { providerFamily: "TestProvider", modelKey: "embed-model", modelUrn: "embed-urn-value" },
        ],
        completions: [
          { providerFamily: "OtherProvider", modelKey: "other-comp", modelUrn: "other-comp-urn" },
        ],
      };

      const result = buildModelsMetadataFromChain(manifest, modelChain);

      // Should only include TestProvider's embed-model
      expect(Object.keys(result)).toEqual(["embed-model"]);
      expect(result["embed-model"].urn).toBe("embed-urn-value");
      // Should not include OtherProvider's models or TestProvider's comp-model (not in chain)
      expect(result["other-embed"]).toBeUndefined();
      expect(result["other-comp"]).toBeUndefined();
      expect(result["comp-model"]).toBeUndefined();
    });

    it("should return empty object when no models match", () => {
      const manifest = createTestManifest(
        "TestProvider",
        [{ modelKey: "embed-model", maxTotalTokens: 8192 }],
        [],
      );

      const modelChain: ResolvedModelChain = {
        embeddings: [{ providerFamily: "OtherProvider", modelKey: "other-embed", modelUrn: "urn" }],
        completions: [{ providerFamily: "OtherProvider", modelKey: "other-comp", modelUrn: "urn" }],
      };

      const result = buildModelsMetadataFromChain(manifest, modelChain);
      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("getCompletionModelKeysFromChain", () => {
    it("should return completion model keys for the specified provider", () => {
      const modelChain: ResolvedModelChain = {
        embeddings: [],
        completions: [
          { providerFamily: "ProviderA", modelKey: "model-a1", modelUrn: "urn-a1" },
          { providerFamily: "ProviderB", modelKey: "model-b1", modelUrn: "urn-b1" },
          { providerFamily: "ProviderA", modelKey: "model-a2", modelUrn: "urn-a2" },
        ],
      };

      const keysA = getCompletionModelKeysFromChain("ProviderA", modelChain);
      expect(keysA).toEqual(["model-a1", "model-a2"]);

      const keysB = getCompletionModelKeysFromChain("ProviderB", modelChain);
      expect(keysB).toEqual(["model-b1"]);

      const keysC = getCompletionModelKeysFromChain("ProviderC", modelChain);
      expect(keysC).toEqual([]);
    });
  });

  describe("getEmbeddingModelKeysFromChain", () => {
    it("should return embedding model keys for the specified provider", () => {
      const modelChain: ResolvedModelChain = {
        embeddings: [
          { providerFamily: "ProviderA", modelKey: "embed-a1", modelUrn: "urn-a1" },
          { providerFamily: "ProviderB", modelKey: "embed-b1", modelUrn: "urn-b1" },
        ],
        completions: [],
      };

      const keysA = getEmbeddingModelKeysFromChain("ProviderA", modelChain);
      expect(keysA).toEqual(["embed-a1"]);

      const keysB = getEmbeddingModelKeysFromChain("ProviderB", modelChain);
      expect(keysB).toEqual(["embed-b1"]);

      const keysC = getEmbeddingModelKeysFromChain("ProviderC", modelChain);
      expect(keysC).toEqual([]);
    });
  });
});

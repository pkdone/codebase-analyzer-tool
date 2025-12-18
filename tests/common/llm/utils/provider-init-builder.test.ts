import {
  buildModelsKeysSet,
  buildModelsMetadataFromResolvedUrns,
} from "../../../../src/common/llm/utils/provider-init-builder";
import { LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import type { LLMProviderManifest } from "../../../../src/common/llm/providers/llm-provider.types";
import type { ResolvedModels } from "../../../../src/common/llm/config/llm-module-config.types";

describe("provider-init-builder", () => {
  describe("buildModelsKeysSet", () => {
    it("should build model keys set with embeddings and primary completion", () => {
      const manifest = {
        models: {
          embeddings: {
            modelKey: "embed-model",
            urnEnvKey: "EMBED_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            maxTotalTokens: 8192,
          },
          primaryCompletion: {
            modelKey: "primary-model",
            urnEnvKey: "PRIMARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 128000,
          },
        },
      } as LLMProviderManifest;

      const result = buildModelsKeysSet(manifest);

      expect(result).toEqual({
        embeddingsModelKey: "embed-model",
        primaryCompletionModelKey: "primary-model",
      });
      expect(result.secondaryCompletionModelKey).toBeUndefined();
    });

    it("should include secondary completion when present", () => {
      const manifest = {
        models: {
          embeddings: {
            modelKey: "embed-model",
            urnEnvKey: "EMBED_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            maxTotalTokens: 8192,
          },
          primaryCompletion: {
            modelKey: "primary-model",
            urnEnvKey: "PRIMARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 128000,
          },
          secondaryCompletion: {
            modelKey: "secondary-model",
            urnEnvKey: "SECONDARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 2048,
            maxTotalTokens: 64000,
          },
        },
      } as LLMProviderManifest;

      const result = buildModelsKeysSet(manifest);

      expect(result).toEqual({
        embeddingsModelKey: "embed-model",
        primaryCompletionModelKey: "primary-model",
        secondaryCompletionModelKey: "secondary-model",
      });
    });
  });

  describe("buildModelsMetadataFromResolvedUrns", () => {
    it("should build metadata with resolved URNs for all models", () => {
      const manifest = {
        models: {
          embeddings: {
            modelKey: "embed-model",
            urnEnvKey: "EMBED_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1536,
            maxTotalTokens: 8192,
          },
          primaryCompletion: {
            modelKey: "primary-model",
            urnEnvKey: "PRIMARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 128000,
          },
        },
      } as LLMProviderManifest;

      const resolvedModels: ResolvedModels = {
        embeddings: "text-embedding-3-small",
        primaryCompletion: "gpt-4o",
      };

      const result = buildModelsMetadataFromResolvedUrns(manifest, resolvedModels);

      expect(result["embed-model"]).toEqual({
        modelKey: "embed-model",
        urnEnvKey: "EMBED_URN",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8192,
        urn: "text-embedding-3-small",
      });

      expect(result["primary-model"]).toEqual({
        modelKey: "primary-model",
        urnEnvKey: "PRIMARY_URN",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 4096,
        maxTotalTokens: 128000,
        urn: "gpt-4o",
      });
    });

    it("should include secondary completion when present in both manifest and resolved models", () => {
      const manifest = {
        models: {
          embeddings: {
            modelKey: "embed-model",
            urnEnvKey: "EMBED_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1536,
            maxTotalTokens: 8192,
          },
          primaryCompletion: {
            modelKey: "primary-model",
            urnEnvKey: "PRIMARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 128000,
          },
          secondaryCompletion: {
            modelKey: "secondary-model",
            urnEnvKey: "SECONDARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 2048,
            maxTotalTokens: 64000,
          },
        },
      } as LLMProviderManifest;

      const resolvedModels: ResolvedModels = {
        embeddings: "text-embedding-3-small",
        primaryCompletion: "gpt-4o",
        secondaryCompletion: "gpt-4o-mini",
      };

      const result = buildModelsMetadataFromResolvedUrns(manifest, resolvedModels);

      expect(Object.keys(result)).toHaveLength(3);
      expect(result["secondary-model"]).toEqual({
        modelKey: "secondary-model",
        urnEnvKey: "SECONDARY_URN",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 2048,
        maxTotalTokens: 64000,
        urn: "gpt-4o-mini",
      });
    });

    it("should not include secondary completion when absent from resolved models", () => {
      const manifest = {
        models: {
          embeddings: {
            modelKey: "embed-model",
            urnEnvKey: "EMBED_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            dimensions: 1536,
            maxTotalTokens: 8192,
          },
          primaryCompletion: {
            modelKey: "primary-model",
            urnEnvKey: "PRIMARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 4096,
            maxTotalTokens: 128000,
          },
          secondaryCompletion: {
            modelKey: "secondary-model",
            urnEnvKey: "SECONDARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 2048,
            maxTotalTokens: 64000,
          },
        },
      } as LLMProviderManifest;

      const resolvedModels: ResolvedModels = {
        embeddings: "text-embedding-3-small",
        primaryCompletion: "gpt-4o",
      };

      const result = buildModelsMetadataFromResolvedUrns(manifest, resolvedModels);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result["secondary-model"]).toBeUndefined();
    });
  });
});

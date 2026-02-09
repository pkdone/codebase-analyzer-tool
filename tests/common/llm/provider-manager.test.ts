import { z } from "zod";
import { ProviderManager } from "../../../src/common/llm/provider-manager";
import type { ProviderManagerConfig } from "../../../src/common/llm/provider-manager";
import type { LLMProvider } from "../../../src/common/llm/types/llm-provider.interface";
import type { LLMProviderManifest, ProviderInit } from "../../../src/common/llm/providers/llm-provider.types";
import type { LLMProviderRegistry } from "../../../src/common/llm/config/llm-module-config.types";
import { ShutdownBehavior } from "../../../src/common/llm/types/llm-shutdown.types";

/**
 * Creates a mock LLMProvider for testing purposes.
 */
function createMockProvider(): LLMProvider {
  return {
    generateEmbeddings: jest.fn(),
    executeCompletion: jest.fn(),
    getAvailableModelNames: jest.fn().mockReturnValue({ embeddings: [], completions: [] }),
    getAvailableCompletionModelKeys: jest.fn().mockReturnValue([]),
    getAvailableEmbeddingModelKeys: jest.fn().mockReturnValue([]),
    getEmbeddingModelDimensions: jest.fn(),
    getProviderFamily: jest.fn().mockReturnValue("testprovider"),
    getModelsMetadata: jest.fn().mockReturnValue({}),
    close: jest.fn().mockResolvedValue(undefined),
    getShutdownBehavior: jest.fn().mockReturnValue(ShutdownBehavior.GRACEFUL),
    validateCredentials: jest.fn().mockResolvedValue(undefined),
  };
}

/**
 * Creates a mock LLMProviderManifest that returns a controlled mock provider.
 */
function createMockManifest(mockProvider: LLMProvider): LLMProviderManifest {
  return {
    providerFamily: "TestProvider",
    envSchema: z.object({}),
    models: {
      embeddings: [],
      completions: [],
    },
    errorPatterns: [],
    providerSpecificConfig: {
      requestTimeoutMillis: 30000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 10000,
    },
    extractConfig: jest.fn().mockReturnValue({}),
    implementation: jest.fn().mockReturnValue(mockProvider) as unknown as new (
      init: ProviderInit,
    ) => LLMProvider,
  };
}

/**
 * Creates a ProviderManagerConfig with a single provider family entry.
 */
function createConfig(
  providerFamily: string,
  manifest: LLMProviderManifest,
): ProviderManagerConfig {
  const registry: LLMProviderRegistry = new Map([
    [providerFamily.toLowerCase(), manifest],
  ]);

  return {
    resolvedModelChain: {
      completions: [{ providerFamily, modelKey: "test-model", modelUrn: "test-urn" }],
      embeddings: [],
    },
    providerParams: {},
    errorLogging: {
      errorLogDirectory: "/tmp/test-logs",
      errorLogFilenameTemplate: "error-{{timestamp}}.json",
    },
    providerRegistry: registry,
  };
}

describe("ProviderManager", () => {
  describe("getProvider - case-insensitive caching", () => {
    it("should return the same provider instance regardless of casing", () => {
      const mockProvider = createMockProvider();
      const manifest = createMockManifest(mockProvider);
      const config = createConfig("TestProvider", manifest);

      const manager = new ProviderManager(config);

      const provider1 = manager.getProvider("TestProvider");
      const provider2 = manager.getProvider("testprovider");
      const provider3 = manager.getProvider("TESTPROVIDER");

      expect(provider1).toBe(provider2);
      expect(provider2).toBe(provider3);
    });

    it("should only instantiate the provider once for different casings", () => {
      const mockProvider = createMockProvider();
      const manifest = createMockManifest(mockProvider);
      const config = createConfig("TestProvider", manifest);

      const manager = new ProviderManager(config);

      manager.getProvider("testprovider");
      manager.getProvider("TESTPROVIDER");
      manager.getProvider("TestProvider");

      // The implementation constructor should only be called once
      expect(manifest.implementation).toHaveBeenCalledTimes(1);
    });

    it("should find manifest with different casing than originally stored", () => {
      const mockProvider = createMockProvider();
      const manifest = createMockManifest(mockProvider);
      const config = createConfig("TestProvider", manifest);

      const manager = new ProviderManager(config);

      // Should not throw even though "TESTPROVIDER" was never directly stored
      expect(() => manager.getProvider("TESTPROVIDER")).not.toThrow();
    });
  });

  describe("getManifest - case-insensitive lookup", () => {
    it("should return the manifest regardless of casing", () => {
      const mockProvider = createMockProvider();
      const manifest = createMockManifest(mockProvider);
      const config = createConfig("TestProvider", manifest);

      const manager = new ProviderManager(config);

      const result1 = manager.getManifest("TestProvider");
      const result2 = manager.getManifest("testprovider");
      const result3 = manager.getManifest("TESTPROVIDER");

      expect(result1).toBe(manifest);
      expect(result2).toBe(manifest);
      expect(result3).toBe(manifest);
    });

    it("should return undefined for unknown provider family", () => {
      const mockProvider = createMockProvider();
      const manifest = createMockManifest(mockProvider);
      const config = createConfig("TestProvider", manifest);

      const manager = new ProviderManager(config);

      expect(manager.getManifest("UnknownProvider")).toBeUndefined();
    });
  });
});

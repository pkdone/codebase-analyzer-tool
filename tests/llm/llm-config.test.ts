import { llmConfig, llmProviderConfig } from "../../src/llm/llm.config";

describe("llmConfig", () => {
  it("should export llmConfig with all expected properties", () => {
    expect(llmConfig).toBeDefined();
    expect(llmConfig.LLM_ROLE_USER).toBe("user");
    expect(llmConfig.LLM_ROLE_ASSISTANT).toBe("assistant");
    expect(llmConfig.LLM_ROLE_SYSTEM).toBe("system");
    expect(llmConfig.DEFAULT_ZERO_TEMP).toBe(0);
    expect(llmConfig.DEFAULT_TOP_P_LOWEST).toBe(0);
    expect(llmConfig.DEFAULT_TOP_K_LOWEST).toBe(1);
    expect(llmConfig.MIME_TYPE_JSON).toBe("application/json");
    expect(llmConfig.MIME_TYPE_ANY).toBe("*/*");
  });

  it("should be a const object", () => {
    // TypeScript enforces immutability at compile time with 'as const'
    // Runtime immutability would require Object.freeze()
    expect(Object.isFrozen(llmConfig)).toBe(false); // Not frozen, but typed as readonly
  });
});

describe("llmProviderConfig", () => {
  it("should export llmProviderConfig with all expected properties", () => {
    expect(llmProviderConfig).toBeDefined();
    expect(llmProviderConfig.MANIFEST_FILE_SUFFIX).toBe(".manifest.js");
    expect(llmProviderConfig.PROVIDER_MANIFEST_EXPORT_SUFFIX).toBe("ProviderManifest");
    expect(llmProviderConfig.PROVIDERS_FOLDER_PATH).toBe("../providers");
    expect(llmProviderConfig.AVERAGE_CHARS_PER_TOKEN).toBe(3.6);
    expect(llmProviderConfig.CHUNK_TOKEN_LIMIT_RATIO).toBe(0.7);
  });

  it("should have correct token calculation constants", () => {
    expect(llmProviderConfig.AVERAGE_CHARS_PER_TOKEN).toBeGreaterThan(0);
    expect(llmProviderConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeGreaterThan(0);
    expect(llmProviderConfig.CHUNK_TOKEN_LIMIT_RATIO).toBeLessThan(1);
  });

  it("should be a const object", () => {
    // TypeScript enforces immutability at compile time with 'as const'
    // Runtime immutability would require Object.freeze()
    expect(Object.isFrozen(llmProviderConfig)).toBe(false); // Not frozen, but typed as readonly
  });
});

describe("llmConfig and llmProviderConfig consolidation", () => {
  it("should export both configurations from the same module", () => {
    // This test verifies that the consolidation was successful
    // Both configs should be importable from llm.config
    expect(llmConfig).toBeDefined();
    expect(llmProviderConfig).toBeDefined();
  });
});

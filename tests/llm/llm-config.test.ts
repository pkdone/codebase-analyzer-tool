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
    expect(llmConfig.JSON_OUTPUT_TYPE).toBe("json_object");
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
  });

  it("should have correct token calculation constant", () => {
    expect(llmProviderConfig.AVERAGE_CHARS_PER_TOKEN).toBeGreaterThan(0);
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

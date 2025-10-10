import { llmConfig, llmProviderConfig } from "../../src/llm/llm.config";

describe("llmConfig", () => {
  it("should have JSON_OUTPUT_TYPE defined", () => {
    expect(llmConfig.JSON_OUTPUT_TYPE).toBeDefined();
    expect(llmConfig.JSON_OUTPUT_TYPE).toBe("json_object");
  });

  it("should have LLM role constants defined", () => {
    expect(llmConfig.LLM_ROLE_USER).toBe("user");
    expect(llmConfig.LLM_ROLE_ASSISTANT).toBe("assistant");
    expect(llmConfig.LLM_ROLE_SYSTEM).toBe("system");
  });

  it("should have MIME type constants defined", () => {
    expect(llmConfig.MIME_TYPE_JSON).toBe("application/json");
    expect(llmConfig.MIME_TYPE_ANY).toBe("*/*");
  });

  it("should have default temperature and sampling constants defined", () => {
    expect(llmConfig.DEFAULT_ZERO_TEMP).toBe(0);
    expect(llmConfig.DEFAULT_TOP_P_LOWEST).toBe(0);
    expect(llmConfig.DEFAULT_TOP_K_LOWEST).toBe(1);
  });

  it("should have token buffer constants defined", () => {
    expect(llmConfig.COMPLETION_MAX_TOKENS_LIMIT_BUFFER).toBe(5);
    expect(llmConfig.MAX_COMPLETION_REDUCTION_RATIO).toBe(0.75);
    expect(llmConfig.MAX_PROMPT_REDUCTION_RATIO).toBe(0.85);
  });

  it("should have UTF8 encoding constant defined", () => {
    expect(llmConfig.LLM_UTF8_ENCODING).toBe("utf8");
  });

  it("should be typed as const", () => {
    // This test verifies that TypeScript treats the config as readonly
    // The 'as const' assertion should make all properties readonly
    const jsonType: "json_object" = llmConfig.JSON_OUTPUT_TYPE;
    expect(jsonType).toBe("json_object");
  });
});

describe("llmProviderConfig", () => {
  it("should have provider manifest configuration defined", () => {
    expect(llmProviderConfig.MANIFEST_FILE_SUFFIX).toBe(".manifest.js");
    expect(llmProviderConfig.PROVIDER_MANIFEST_EXPORT_SUFFIX).toBe("ProviderManifest");
    expect(llmProviderConfig.PROVIDERS_FOLDER_PATH).toBe("../providers");
  });

  it("should have average chars per token defined", () => {
    expect(llmProviderConfig.AVERAGE_CHARS_PER_TOKEN).toBe(3.6);
  });

  it("should be typed as const", () => {
    const suffix: ".manifest.js" = llmProviderConfig.MANIFEST_FILE_SUFFIX;
    expect(suffix).toBe(".manifest.js");
  });
});

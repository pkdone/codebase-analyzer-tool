import {
  llmConfig,
  llmProviderConfig,
  DEFAULT_PROVIDER_CONFIG,
} from "../../../src/common/llm/config/llm.config";

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

  it("should be typed as const", () => {
    // This test verifies that TypeScript treats the config as readonly
    // The 'as const' assertion should make all properties readonly
    const jsonType: "json_object" = llmConfig.JSON_OUTPUT_TYPE;
    expect(jsonType).toBe("json_object");
  });

  describe("MIME type and encoding configuration", () => {
    it("should have MIME_TYPE_JSON defined", () => {
      expect(llmConfig.MIME_TYPE_JSON).toBeDefined();
      expect(llmConfig.MIME_TYPE_JSON).toBe("application/json");
    });

    it("should have MIME_TYPE_ANY defined", () => {
      expect(llmConfig.MIME_TYPE_ANY).toBeDefined();
      expect(llmConfig.MIME_TYPE_ANY).toBe("*/*");
    });

    it("should have UTF8_ENCODING defined for LLM operations", () => {
      expect(llmConfig.UTF8_ENCODING).toBeDefined();
      expect(llmConfig.UTF8_ENCODING).toBe("utf8");
    });

    it("should have valid MIME type formats", () => {
      expect(typeof llmConfig.MIME_TYPE_JSON).toBe("string");
      expect(typeof llmConfig.MIME_TYPE_ANY).toBe("string");
      expect(llmConfig.MIME_TYPE_JSON).toContain("/");
      expect(llmConfig.MIME_TYPE_ANY).toContain("/");
    });

    it("should be typed as const for MIME and encoding constants", () => {
      const mimeJson: "application/json" = llmConfig.MIME_TYPE_JSON;
      const mimeAny: "*/*" = llmConfig.MIME_TYPE_ANY;
      const encoding: "utf8" = llmConfig.UTF8_ENCODING;

      expect(mimeJson).toBe("application/json");
      expect(mimeAny).toBe("*/*");
      expect(encoding).toBe("utf8");
    });
  });
});

describe("llmProviderConfig", () => {
  it("should have average chars per token defined", () => {
    expect(llmProviderConfig.AVERAGE_CHARS_PER_TOKEN).toBe(3.6);
  });

  it("should be typed as const", () => {
    // This test verifies that TypeScript treats the config as readonly
    // The 'as const' assertion should make all properties readonly
    const avgChars: 3.6 = llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;
    expect(avgChars).toBe(3.6);
  });
});

describe("DEFAULT_PROVIDER_CONFIG", () => {
  describe("timeout configuration", () => {
    it("should have requestTimeoutMillis defined", () => {
      expect(DEFAULT_PROVIDER_CONFIG.requestTimeoutMillis).toBeDefined();
      expect(typeof DEFAULT_PROVIDER_CONFIG.requestTimeoutMillis).toBe("number");
    });

    it("should have 5 minutes as default timeout", () => {
      expect(DEFAULT_PROVIDER_CONFIG.requestTimeoutMillis).toBe(5 * 60 * 1000);
    });
  });

  describe("retry configuration", () => {
    it("should have maxRetryAttempts defined", () => {
      expect(DEFAULT_PROVIDER_CONFIG.maxRetryAttempts).toBeDefined();
      expect(DEFAULT_PROVIDER_CONFIG.maxRetryAttempts).toBe(3);
    });

    it("should have minRetryDelayMillis defined", () => {
      expect(DEFAULT_PROVIDER_CONFIG.minRetryDelayMillis).toBeDefined();
      expect(DEFAULT_PROVIDER_CONFIG.minRetryDelayMillis).toBe(10 * 1000);
    });

    it("should have maxRetryDelayMillis defined", () => {
      expect(DEFAULT_PROVIDER_CONFIG.maxRetryDelayMillis).toBeDefined();
      expect(DEFAULT_PROVIDER_CONFIG.maxRetryDelayMillis).toBe(90 * 1000);
    });

    it("should have minRetryDelayMillis less than maxRetryDelayMillis", () => {
      expect(DEFAULT_PROVIDER_CONFIG.minRetryDelayMillis).toBeLessThan(
        DEFAULT_PROVIDER_CONFIG.maxRetryDelayMillis,
      );
    });
  });

  describe("immutability", () => {
    it("should be a readonly object with all required retry fields", () => {
      expect(DEFAULT_PROVIDER_CONFIG).toHaveProperty("requestTimeoutMillis");
      expect(DEFAULT_PROVIDER_CONFIG).toHaveProperty("maxRetryAttempts");
      expect(DEFAULT_PROVIDER_CONFIG).toHaveProperty("minRetryDelayMillis");
      expect(DEFAULT_PROVIDER_CONFIG).toHaveProperty("maxRetryDelayMillis");
    });
  });
});

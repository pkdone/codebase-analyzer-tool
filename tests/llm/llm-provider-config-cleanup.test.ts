import { llmProviderConfig } from "../../src/llm/llm.config";

/**
 * Unit tests to verify that unused LLM provider config constants have been removed.
 * These tests ensure that cleanup recommendations have been properly implemented.
 */
describe("LLM Provider Config Cleanup", () => {
  it("should not contain MANIFEST_FILE_SUFFIX", () => {
    // Verify that MANIFEST_FILE_SUFFIX has been removed
    expect(llmProviderConfig).not.toHaveProperty("MANIFEST_FILE_SUFFIX");
  });

  it("should not contain PROVIDER_MANIFEST_EXPORT_SUFFIX", () => {
    // Verify that PROVIDER_MANIFEST_EXPORT_SUFFIX has been removed
    expect(llmProviderConfig).not.toHaveProperty("PROVIDER_MANIFEST_EXPORT_SUFFIX");
  });

  it("should not contain PROVIDERS_FOLDER_PATH", () => {
    // Verify that PROVIDERS_FOLDER_PATH has been removed
    expect(llmProviderConfig).not.toHaveProperty("PROVIDERS_FOLDER_PATH");
  });

  it("should still contain AVERAGE_CHARS_PER_TOKEN", () => {
    // Verify that essential constant is still present
    expect(llmProviderConfig).toHaveProperty("AVERAGE_CHARS_PER_TOKEN");
    expect(llmProviderConfig.AVERAGE_CHARS_PER_TOKEN).toBe(3.6);
  });
});

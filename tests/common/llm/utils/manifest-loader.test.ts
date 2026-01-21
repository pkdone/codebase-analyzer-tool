import "reflect-metadata";
import { loadManifestForProviderFamily } from "../../../../src/common/llm/utils/manifest-loader";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

describe("manifest-loader", () => {
  describe("loadManifestForProviderFamily", () => {
    it("should throw error for unknown model family", () => {
      expect(() => loadManifestForProviderFamily("unknownFamily")).toThrow(LLMError);
      const errorFn = () => loadManifestForProviderFamily("unknownFamily");
      expect(errorFn).toThrow(/No provider manifest found for provider family: unknownFamily/);
      try {
        errorFn();
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
      }
    });

    it("should load manifest for valid model family (case-insensitive)", () => {
      // Test with a known provider from the registry
      const manifest = loadManifestForProviderFamily("openai");
      expect(manifest).toBeDefined();
      expect(manifest.providerFamily.toLowerCase()).toBe("openai");

      // Test case-insensitive matching
      const manifestUpper = loadManifestForProviderFamily("OPENAI");
      expect(manifestUpper).toBe(manifest);

      const manifestMixed = loadManifestForProviderFamily("OpenAI");
      expect(manifestMixed).toBe(manifest);
    });

    it("should include available families in error message", () => {
      try {
        loadManifestForProviderFamily("unknownFamily");
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("Available families:");
        // Should list some known providers
        expect(errorMessage).toMatch(/openai|azureopenai|vertexaigemini/i);
      }
    });

    it("should return manifest with all expected properties", () => {
      const manifest = loadManifestForProviderFamily("openai");

      expect(manifest.models).toBeDefined();
      // Models are now arrays, not objects with named properties
      expect(Array.isArray(manifest.models.embeddings)).toBe(true);
      expect(Array.isArray(manifest.models.completions)).toBe(true);
      expect(manifest.models.embeddings.length).toBeGreaterThan(0);
      expect(manifest.models.completions.length).toBeGreaterThan(0);
      expect(manifest.providerSpecificConfig).toBeDefined();
      expect(manifest.implementation).toBeDefined();
      expect(typeof manifest.implementation).toBe("function");
      expect(manifest.providerFamily).toBeDefined();
    });
  });
});

import "reflect-metadata";
import { loadManifestForModelFamily } from "../../../../src/common/llm/utils/manifest-loader";
import { BadConfigurationLLMError } from "../../../../src/common/llm/types/llm-errors.types";

describe("manifest-loader", () => {
  describe("loadManifestForModelFamily", () => {
    it("should throw error for unknown model family", () => {
      expect(() => loadManifestForModelFamily("unknownFamily")).toThrow(BadConfigurationLLMError);
      expect(() => loadManifestForModelFamily("unknownFamily")).toThrow(
        /No provider manifest found for model family: unknownFamily/,
      );
    });

    it("should load manifest for valid model family (case-insensitive)", () => {
      // Test with a known provider from the registry
      const manifest = loadManifestForModelFamily("openai");
      expect(manifest).toBeDefined();
      expect(manifest.modelFamily.toLowerCase()).toBe("openai");

      // Test case-insensitive matching
      const manifestUpper = loadManifestForModelFamily("OPENAI");
      expect(manifestUpper).toBe(manifest);

      const manifestMixed = loadManifestForModelFamily("OpenAI");
      expect(manifestMixed).toBe(manifest);
    });

    it("should include available families in error message", () => {
      try {
        loadManifestForModelFamily("unknownFamily");
        fail("Should have thrown an error");
      } catch (error) {
        expect(error).toBeInstanceOf(BadConfigurationLLMError);
        const errorMessage = (error as Error).message;
        expect(errorMessage).toContain("Available families:");
        // Should list some known providers
        expect(errorMessage).toMatch(/openai|azureopenai|vertexaigemini/i);
      }
    });

    it("should return manifest with all expected properties", () => {
      const manifest = loadManifestForModelFamily("openai");

      expect(manifest.models).toBeDefined();
      expect(manifest.models.embeddings).toBeDefined();
      expect(manifest.models.primaryCompletion).toBeDefined();
      expect(manifest.providerSpecificConfig).toBeDefined();
      expect(manifest.implementation).toBeDefined();
      expect(typeof manifest.implementation).toBe("function");
      expect(manifest.modelFamily).toBeDefined();
      expect(manifest.providerName).toBeDefined();
    });
  });
});

import { createPromptMetadata } from "../../../src/app/prompts/prompt-registry";
import {
  DATA_BLOCK_HEADERS,
  PromptConfigEntry,
  AppSummaryConfigEntry,
} from "../../../src/app/prompts/prompt.types";
import { z } from "zod";

/**
 * Unit tests for config-level override behavior in createPromptMetadata.
 * These tests verify that config-level dataBlockHeader and wrapInCodeBlock
 * values take precedence over options-level defaults.
 */
describe("Prompt Config Overrides", () => {
  const testTemplate = "Test template with {{contentDesc}}";

  /**
   * Helper to create a valid test config entry with required fields.
   */
  function createTestConfig(overrides?: Partial<PromptConfigEntry>): PromptConfigEntry {
    return {
      contentDesc: "test content",
      instructions: ["test instruction"],
      responseSchema: z.string(),
      ...overrides,
    };
  }

  describe("dataBlockHeader override behavior", () => {
    it("should use options-level default when config has no override", () => {
      const testConfigMap = {
        test1: createTestConfig({ label: "Test 1" }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
      });

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
    });

    it("should use config-level override when present", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
      });

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
    });

    it("should use FILE_SUMMARIES as default when no options or config override", () => {
      const testConfigMap = {
        test1: createTestConfig({ label: "Test 1" }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
    });

    it("should handle mixed overrides (some configs with override, some without)", () => {
      const testConfigMap = {
        withOverride: createTestConfig({
          label: "With Override",
          dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
        }),
        withoutOverride: createTestConfig({
          label: "Without Override",
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
      });

      expect(result.withOverride.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
      expect(result.withoutOverride.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
    });
  });

  describe("wrapInCodeBlock override behavior", () => {
    it("should use options-level default when config has no override", () => {
      const testConfigMap = {
        test1: createTestConfig({ label: "Test 1" }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        wrapInCodeBlock: true,
      });

      expect(result.test1.wrapInCodeBlock).toBe(true);
    });

    it("should use config-level override when present", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          wrapInCodeBlock: false,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        wrapInCodeBlock: true,
      });

      expect(result.test1.wrapInCodeBlock).toBe(false);
    });

    it("should use false as default when no options or config override", () => {
      const testConfigMap = {
        test1: createTestConfig({ label: "Test 1" }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.wrapInCodeBlock).toBe(false);
    });

    it("should handle mixed overrides (some configs with override, some without)", () => {
      const testConfigMap = {
        withOverride: createTestConfig({
          label: "With Override",
          wrapInCodeBlock: false,
        }),
        withoutOverride: createTestConfig({
          label: "Without Override",
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        wrapInCodeBlock: true,
      });

      expect(result.withOverride.wrapInCodeBlock).toBe(false);
      expect(result.withoutOverride.wrapInCodeBlock).toBe(true);
    });
  });

  describe("combined override scenarios", () => {
    it("should handle both overrides on the same config", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
          wrapInCodeBlock: false,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: true,
      });

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
      expect(result.test1.wrapInCodeBlock).toBe(false);
    });

    it("should handle partial overrides (only dataBlockHeader)", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: true,
      });

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
      expect(result.test1.wrapInCodeBlock).toBe(true);
    });

    it("should handle partial overrides (only wrapInCodeBlock)", () => {
      const testConfigMap = {
        test1: createTestConfig({
          label: "Test 1",
          wrapInCodeBlock: false,
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: true,
      });

      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.test1.wrapInCodeBlock).toBe(false);
    });

    it("should handle complex mixed scenario with multiple configs", () => {
      const testConfigMap = {
        fullOverride: createTestConfig({
          label: "Full Override",
          dataBlockHeader: DATA_BLOCK_HEADERS.FILE_SUMMARIES,
          wrapInCodeBlock: true,
        }),
        partialOverrideHeader: createTestConfig({
          label: "Partial Override Header",
          dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
        }),
        partialOverrideWrap: createTestConfig({
          label: "Partial Override Wrap",
          wrapInCodeBlock: false,
        }),
        noOverride: createTestConfig({
          label: "No Override",
        }),
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        wrapInCodeBlock: true,
      });

      // Full override - both config values used
      expect(result.fullOverride.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
      expect(result.fullOverride.wrapInCodeBlock).toBe(true);

      // Partial override (header only) - header from config, wrap from options
      expect(result.partialOverrideHeader.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
      expect(result.partialOverrideHeader.wrapInCodeBlock).toBe(true);

      // Partial override (wrap only) - header from options, wrap from config
      expect(result.partialOverrideWrap.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.partialOverrideWrap.wrapInCodeBlock).toBe(false);

      // No override - both from options
      expect(result.noOverride.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.CODE);
      expect(result.noOverride.wrapInCodeBlock).toBe(true);
    });
  });

  describe("AppSummaryConfigEntry type compatibility", () => {
    it("should accept AppSummaryConfigEntry with override fields", () => {
      const appSummaryConfig: AppSummaryConfigEntry = {
        label: "Test App Summary",
        contentDesc: "a set of source file summaries",
        instructions: ["analyze the summaries"],
        responseSchema: z.object({ result: z.string() }),
        dataBlockHeader: DATA_BLOCK_HEADERS.FRAGMENTED_DATA,
        wrapInCodeBlock: true,
      };

      const testConfigMap = {
        testSummary: appSummaryConfig,
      };

      const result = createPromptMetadata(testConfigMap, testTemplate, {
        dataBlockHeader: DATA_BLOCK_HEADERS.FILE_SUMMARIES,
        wrapInCodeBlock: false,
      });

      expect(result.testSummary.label).toBe("Test App Summary");
      expect(result.testSummary.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FRAGMENTED_DATA);
      expect(result.testSummary.wrapInCodeBlock).toBe(true);
    });

    it("should require label field for AppSummaryConfigEntry", () => {
      // This is a compile-time test - the following should compile
      const validConfig: AppSummaryConfigEntry = {
        label: "Required Label",
        contentDesc: "test",
        instructions: [],
        responseSchema: z.string(),
      };

      expect(validConfig.label).toBe("Required Label");
    });
  });

  describe("default behavior preservation", () => {
    it("should preserve existing default behavior when no overrides specified", () => {
      const testConfigMap = {
        test1: createTestConfig({ label: "Test 1" }),
        test2: createTestConfig({ label: "Test 2" }),
      };

      // No options provided - should use defaults
      const result = createPromptMetadata(testConfigMap, testTemplate);

      // Default dataBlockHeader should be FILE_SUMMARIES
      expect(result.test1.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);
      expect(result.test2.dataBlockHeader).toBe(DATA_BLOCK_HEADERS.FILE_SUMMARIES);

      // Default wrapInCodeBlock should be false
      expect(result.test1.wrapInCodeBlock).toBe(false);
      expect(result.test2.wrapInCodeBlock).toBe(false);
    });

    it("should preserve all other PromptDefinition fields", () => {
      const schema = z.object({ items: z.array(z.string()) });
      const testConfigMap = {
        test1: {
          label: "Test Label",
          contentDesc: "test content description",
          instructions: ["instruction 1", "instruction 2"],
          responseSchema: schema,
          dataBlockHeader: DATA_BLOCK_HEADERS.CODE,
        },
      };

      const result = createPromptMetadata(testConfigMap, testTemplate);

      expect(result.test1.label).toBe("Test Label");
      expect(result.test1.contentDesc).toBe("test content description");
      expect(result.test1.instructions).toEqual(["instruction 1", "instruction 2"]);
      expect(result.test1.responseSchema).toBe(schema);
      expect(result.test1.template).toBe(testTemplate);
    });
  });
});

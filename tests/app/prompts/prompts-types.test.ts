/**
 * Tests for prompt type definitions and interface contracts.
 *
 * These tests verify that the BasePromptConfigEntry interface and its
 * extending interfaces (SourceConfigEntry, AppSummaryConfigEntry) maintain
 * proper type contracts and are used correctly.
 */

import { z } from "zod";
import type { BasePromptConfigEntry } from "../../../src/app/prompts/prompts.types";
import type { SourceConfigEntry } from "../../../src/app/prompts/sources/definitions/source-config-factories";
import type { AppSummaryConfigEntry } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";

describe("Prompt Type Definitions", () => {
  describe("BasePromptConfigEntry", () => {
    it("should define required fields for prompt configurations", () => {
      const testSchema = z.object({ name: z.string() });

      const config: BasePromptConfigEntry<typeof testSchema> = {
        contentDesc: "test content description",
        instructions: ["instruction 1", "instruction 2"],
        responseSchema: testSchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(config.contentDesc).toBe("test content description");
      expect(config.instructions).toHaveLength(2);
      expect(config.responseSchema).toBe(testSchema);
      expect(config.dataBlockHeader).toBe("CODE");
      expect(config.wrapInCodeBlock).toBe(true);
    });

    it("should work with readonly arrays", () => {
      const testSchema = z.string();

      const config: BasePromptConfigEntry<typeof testSchema> = {
        contentDesc: "description",
        instructions: ["read", "only", "array"] as const,
        responseSchema: testSchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(config.instructions).toHaveLength(3);
    });

    it("should support generic schema types", () => {
      const simpleSchema = z.string();
      const objectSchema = z.object({ value: z.number() });
      const arraySchema = z.array(z.string());

      const simpleConfig: BasePromptConfigEntry<typeof simpleSchema> = {
        contentDesc: "simple",
        instructions: [],
        responseSchema: simpleSchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      const objectConfig: BasePromptConfigEntry<typeof objectSchema> = {
        contentDesc: "object",
        instructions: [],
        responseSchema: objectSchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      const arrayConfig: BasePromptConfigEntry<typeof arraySchema> = {
        contentDesc: "array",
        instructions: [],
        responseSchema: arraySchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(simpleConfig.responseSchema).toBe(simpleSchema);
      expect(objectConfig.responseSchema).toBe(objectSchema);
      expect(arrayConfig.responseSchema).toBe(arraySchema);
    });

    it("should allow default generic type (z.ZodType)", () => {
      const config: BasePromptConfigEntry = {
        contentDesc: "default generic",
        instructions: ["test"],
        responseSchema: z.unknown(),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(config.responseSchema).toBeDefined();
    });
  });

  describe("SourceConfigEntry extends BasePromptConfigEntry", () => {
    it("should include base fields plus hasComplexSchema", () => {
      const testSchema = z.object({ purpose: z.string() });

      const config: SourceConfigEntry<typeof testSchema> = {
        contentDesc: "source description",
        instructions: ["extract info"],
        responseSchema: testSchema,
        hasComplexSchema: true,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(config.contentDesc).toBe("source description");
      expect(config.instructions).toHaveLength(1);
      expect(config.responseSchema).toBe(testSchema);
      expect(config.hasComplexSchema).toBe(true);
    });

    it("should allow hasComplexSchema to be optional", () => {
      const testSchema = z.string();

      const configWithoutComplexSchema: SourceConfigEntry<typeof testSchema> = {
        contentDesc: "description",
        instructions: [],
        responseSchema: testSchema,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      const configWithFalseComplexSchema: SourceConfigEntry<typeof testSchema> = {
        contentDesc: "description",
        instructions: [],
        responseSchema: testSchema,
        hasComplexSchema: false,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      expect(configWithoutComplexSchema.hasComplexSchema).toBeUndefined();
      expect(configWithFalseComplexSchema.hasComplexSchema).toBe(false);
    });

    it("should be assignable to BasePromptConfigEntry", () => {
      const testSchema = z.object({ name: z.string() });

      const sourceConfig: SourceConfigEntry<typeof testSchema> = {
        contentDesc: "source",
        instructions: ["inst"],
        responseSchema: testSchema,
        hasComplexSchema: true,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      // SourceConfigEntry should be compatible with BasePromptConfigEntry
      const baseConfig: BasePromptConfigEntry<typeof testSchema> = sourceConfig;

      expect(baseConfig.contentDesc).toBe("source");
      expect(baseConfig.instructions).toEqual(["inst"]);
      expect(baseConfig.responseSchema).toBe(testSchema);
    });
  });

  describe("AppSummaryConfigEntry extends BasePromptConfigEntry", () => {
    it("should include base fields plus dataBlockHeader and wrapInCodeBlock", () => {
      const testSchema = z.object({ technologies: z.array(z.string()) });

      const config: AppSummaryConfigEntry<typeof testSchema> = {
        contentDesc: "app summary description",
        instructions: ["list technologies"],
        responseSchema: testSchema,
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      };

      expect(config.contentDesc).toBe("app summary description");
      expect(config.instructions).toHaveLength(1);
      expect(config.responseSchema).toBe(testSchema);
      expect(config.dataBlockHeader).toBe("FILE_SUMMARIES");
      expect(config.wrapInCodeBlock).toBe(false);
    });

    it("should require dataBlockHeader and wrapInCodeBlock", () => {
      const testSchema = z.string();

      // TypeScript would error if dataBlockHeader or wrapInCodeBlock is omitted
      const config: AppSummaryConfigEntry<typeof testSchema> = {
        contentDesc: "description",
        instructions: [],
        responseSchema: testSchema,
        dataBlockHeader: "REQUIRED_HEADER",
        wrapInCodeBlock: false,
      };

      expect(config.dataBlockHeader).toBe("REQUIRED_HEADER");
      expect(config.wrapInCodeBlock).toBe(false);
    });

    it("should be assignable to BasePromptConfigEntry", () => {
      const testSchema = z.object({ result: z.string() });

      const appConfig: AppSummaryConfigEntry<typeof testSchema> = {
        contentDesc: "app",
        instructions: ["inst"],
        responseSchema: testSchema,
        dataBlockHeader: "DATA",
        wrapInCodeBlock: false,
      };

      // AppSummaryConfigEntry should be compatible with BasePromptConfigEntry
      const baseConfig: BasePromptConfigEntry<typeof testSchema> = appConfig;

      expect(baseConfig.contentDesc).toBe("app");
      expect(baseConfig.instructions).toEqual(["inst"]);
      expect(baseConfig.responseSchema).toBe(testSchema);
    });
  });

  describe("Interface compatibility", () => {
    it("should allow polymorphic usage via BasePromptConfigEntry", () => {
      const schema = z.object({ value: z.number() });

      const sourceConfig: SourceConfigEntry<typeof schema> = {
        contentDesc: "source",
        instructions: ["a"],
        responseSchema: schema,
        hasComplexSchema: true,
        dataBlockHeader: "CODE",
        wrapInCodeBlock: true,
      };

      const appConfig: AppSummaryConfigEntry<typeof schema> = {
        contentDesc: "app",
        instructions: ["b"],
        responseSchema: schema,
        dataBlockHeader: "FILE_SUMMARIES",
        wrapInCodeBlock: false,
      };

      // Both should be usable as BasePromptConfigEntry
      const configs: BasePromptConfigEntry<typeof schema>[] = [sourceConfig, appConfig];

      expect(configs).toHaveLength(2);
      expect(configs[0].contentDesc).toBe("source");
      expect(configs[1].contentDesc).toBe("app");
    });
  });
});

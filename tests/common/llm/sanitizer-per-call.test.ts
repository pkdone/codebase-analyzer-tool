import {
  LLMCompletionOptions,
  LLMOutputFormat,
} from "../../../src/common/llm/types/llm-request.types";
import { z } from "zod";
import { LLMSanitizerConfig } from "../../../src/common/llm/config/llm-module-config.types";

describe("Sanitizer Config Per-Call", () => {
  describe("LLMCompletionOptions with sanitizerConfig", () => {
    it("should allow sanitizerConfig to be added to completion options", () => {
      const sanitizerConfig: LLMSanitizerConfig = {
        propertyNameMappings: { se: "purpose" },
        knownProperties: ["name", "purpose"],
      };

      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: z.object({ name: z.string() }),
        hasComplexSchema: false,
        sanitizerConfig,
      };

      expect(options.sanitizerConfig).toBeDefined();
      expect(options.sanitizerConfig?.propertyNameMappings).toEqual({ se: "purpose" });
      expect(options.sanitizerConfig?.knownProperties).toEqual(["name", "purpose"]);
    });

    it("should allow sanitizerConfig to be undefined", () => {
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: z.object({ name: z.string() }),
        hasComplexSchema: false,
      };

      expect(options.sanitizerConfig).toBeUndefined();
    });

    it("should allow different sanitizer configs for different calls", () => {
      const sanitizerConfig1: LLMSanitizerConfig = {
        propertyNameMappings: { se: "purpose" },
      };

      const sanitizerConfig2: LLMSanitizerConfig = {
        propertyNameMappings: { na: "name" },
      };

      const options1: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        sanitizerConfig: sanitizerConfig1,
      };

      const options2: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        sanitizerConfig: sanitizerConfig2,
      };

      expect(options1.sanitizerConfig?.propertyNameMappings).toEqual({ se: "purpose" });
      expect(options2.sanitizerConfig?.propertyNameMappings).toEqual({ na: "name" });
    });

    it("should work with TEXT output format without sanitizer", () => {
      const options: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.TEXT,
      };

      expect(options.sanitizerConfig).toBeUndefined();
      expect(options.outputFormat).toBe(LLMOutputFormat.TEXT);
    });
  });
});

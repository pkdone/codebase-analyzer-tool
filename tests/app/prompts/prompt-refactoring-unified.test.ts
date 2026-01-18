import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt.config";
import {
  appSummaryConfigMap,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  APP_SUMMARY_CONTENT_DESC,
} from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import { SOURCES_PROMPT_FRAGMENTS } from "../../../src/app/prompts/sources/sources.fragments";
import { APP_SUMMARY_PROMPT_FRAGMENTS } from "../../../src/app/prompts/app-summaries/app-summaries.fragments";
import { INSTRUCTION_SECTION_TITLES } from "../../../src/app/prompts/sources/source-instruction-utils";
import {
  fileTypePromptRegistry,
  CODE_DATA_BLOCK_HEADER,
} from "../../../src/app/prompts/sources/sources.definitions";
import { z } from "zod";

/**
 * Helper to create a JSONSchemaPrompt from fileTypePromptRegistry config.
 * Adds dataBlockHeader and wrapInCodeBlock which are no longer in the registry entries.
 */
function createSourcePrompt(fileType: keyof typeof fileTypePromptRegistry): JSONSchemaPrompt {
  const config = fileTypePromptRegistry[fileType];
  return new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    ...config,
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
  } as JSONSchemaPromptConfig);
}

/**
 * Helper to create a JSONSchemaPrompt from appSummaryConfigMap config.
 * Adds contentDesc, dataBlockHeader, and wrapInCodeBlock which are no longer in the config entries.
 */
function createAppSummaryPrompt(category: keyof typeof appSummaryConfigMap): JSONSchemaPrompt {
  const config = appSummaryConfigMap[category];
  return new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    ...config,
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    wrapInCodeBlock: false,
  } as JSONSchemaPromptConfig);
}

describe("JSONSchemaPrompt Refactoring - Unified Configuration", () => {
  describe("Sources Configuration", () => {
    it("should have instructions as readonly string[] for all file types", () => {
      Object.entries(fileTypePromptRegistry).forEach(([, config]) => {
        expect(config.instructions).toBeDefined();
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        config.instructions.forEach((instruction) => {
          expect(typeof instruction).toBe("string");
          expect(instruction.length).toBeGreaterThan(0);
        });
      });
    });

    it("should format instruction sections with titles correctly", () => {
      const javaConfig = fileTypePromptRegistry.java;
      const firstInstruction = javaConfig.instructions[0];

      // Should contain section title
      expect(firstInstruction).toContain(`__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`);
      // Should contain instruction content
      expect(firstInstruction).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
    });

    it("should render prompts correctly with new instruction format", () => {
      const javaPrompt = createSourcePrompt("java");
      const testCode = "public class Test {}";

      const rendered = javaPrompt.renderPrompt(testCode);

      // Verify section titles are present
      expect(rendered).toContain(`__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`);
      expect(rendered).toContain(`__${INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS}__`);

      // Verify instructions are properly joined
      expect(rendered).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(rendered).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
    });

    it("should maintain instruction separation with double newlines", () => {
      const javaPrompt = createSourcePrompt("java");
      const testCode = "public class Test {}";

      const rendered = javaPrompt.renderPrompt(testCode);

      // Since we can't directly test the template variable, we test the rendered output
      // which should have proper section separation
      const basicInfoIndex = rendered.indexOf(INSTRUCTION_SECTION_TITLES.BASIC_INFO);
      const refsIndex = rendered.indexOf(INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS);

      expect(basicInfoIndex).toBeGreaterThan(-1);
      expect(refsIndex).toBeGreaterThan(basicInfoIndex);
    });
  });

  describe("App Summaries Configuration", () => {
    it("should have instructions as readonly string[] for all app summary types", () => {
      Object.entries(appSummaryConfigMap).forEach(([, config]) => {
        expect(config.instructions).toBeDefined();
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        config.instructions.forEach((instruction) => {
          expect(typeof instruction).toBe("string");
          expect(instruction.length).toBeGreaterThan(0);
        });
      });
    });

    it("should export APP_SUMMARY_CONTENT_DESC constant", () => {
      // contentDesc is now set at instantiation time by the consumer
      // The constant is exported for consumers to use
      expect(APP_SUMMARY_CONTENT_DESC).toBe("a set of source file summaries");
    });

    it("should render app summary prompts correctly when presentation values added", () => {
      const prompt = createAppSummaryPrompt("appDescription");
      const testSummaries = "Test summary content";

      const rendered = prompt.renderPrompt(testSummaries);

      // Should contain the instruction text
      expect(rendered).toContain(
        "a detailed description of the application's purpose and implementation",
      );
      // Should contain the content
      expect(rendered).toContain(testSummaries);
    });
  });

  describe("Fragment Organization", () => {
    it("should have APP_SUMMARY_FRAGMENTS as a separate export", () => {
      expect(APP_SUMMARY_PROMPT_FRAGMENTS).toBeDefined();
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST).toBeDefined();
    });
  });

  describe("JSONSchemaPrompt Rendering Consistency", () => {
    it("should join instructions with double newlines", () => {
      const testPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["Instruction 1", "Instruction 2", "Instruction 3"],
        responseSchema: z.object({ test: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });

      const rendered = testPrompt.renderPrompt("test");

      // Instructions are joined with double newlines
      expect(rendered).toContain("Instruction 1\n\nInstruction 2\n\nInstruction 3");
    });

    it("should handle single instruction correctly", () => {
      const testPrompt = new JSONSchemaPrompt({
        personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
        contentDesc: "test content",
        instructions: ["Single instruction"],
        responseSchema: z.object({ test: z.string() }),
        dataBlockHeader: "CODE",
        wrapInCodeBlock: false,
      });

      const rendered = testPrompt.renderPrompt("test");

      expect(rendered).toContain("Single instruction");
    });
  });
});

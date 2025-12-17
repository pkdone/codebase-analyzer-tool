import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";
import { fileTypePromptMetadata } from "../../../src/app/prompts/definitions/sources";
import { appSummaryPromptMetadata } from "../../../src/app/prompts/definitions/app-summaries";
import { SOURCES_PROMPT_FRAGMENTS } from "../../../src/app/prompts/definitions/sources/sources.fragments";
import { APP_SUMMARY_PROMPT_FRAGMENTS } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.fragments";
import { INSTRUCTION_SECTION_TITLES } from "../../../src/app/prompts/definitions/instruction-titles";
import { sourceConfigMap } from "../../../src/app/prompts/definitions/sources/sources.config";
import { appSummaryConfigMap } from "../../../src/app/prompts/definitions/app-summaries/app-summaries.config";
import { z } from "zod";

describe("Prompt Refactoring - Unified Configuration", () => {
  describe("Sources Configuration", () => {
    it("should have instructions as readonly string[] for all file types", () => {
      Object.entries(sourceConfigMap).forEach(([, config]) => {
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
      const javaConfig = sourceConfigMap.java;
      const firstInstruction = javaConfig.instructions[0];

      // Should contain section title
      expect(firstInstruction).toContain(`__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`);
      // Should contain instruction content
      expect(firstInstruction).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
    });

    it("should render prompts correctly with new instruction format", () => {
      const javaMetadata = fileTypePromptMetadata.java;
      const testCode = "public class Test {}";

      const rendered = renderPrompt(javaMetadata, { content: testCode });

      // Verify section titles are present
      expect(rendered).toContain(`__${INSTRUCTION_SECTION_TITLES.BASIC_INFO}__`);
      expect(rendered).toContain(`__${INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS}__`);

      // Verify instructions are properly joined
      expect(rendered).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(rendered).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
    });

    it("should maintain instruction separation with double newlines", () => {
      const javaMetadata = fileTypePromptMetadata.java;
      const testCode = "public class Test {}";

      const rendered = renderPrompt(javaMetadata, { content: testCode });

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

    it("should use instructions instead of contentDesc", () => {
      const appDescriptionConfig = appSummaryConfigMap.appDescription;

      // Should have instructions property
      expect(appDescriptionConfig.instructions).toBeDefined();
      // Should not have contentDesc property (old structure)
      expect((appDescriptionConfig as { contentDesc?: string }).contentDesc).toBeUndefined();
    });

    it("should render app summary prompts correctly", () => {
      const appDescriptionMetadata = appSummaryPromptMetadata.appDescription;
      const testSummaries = "Test summary content";

      const rendered = renderPrompt(appDescriptionMetadata, { content: testSummaries });

      // Should contain the instruction text
      expect(rendered).toContain(APP_SUMMARY_PROMPT_FRAGMENTS.DETAILED_DESCRIPTION);
      // Should contain the content
      expect(rendered).toContain(testSummaries);
    });
  });

  describe("Fragment Organization", () => {
    it("should have APP_SUMMARY_FRAGMENTS as a separate export", () => {
      expect(APP_SUMMARY_PROMPT_FRAGMENTS).toBeDefined();
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.DETAILED_DESCRIPTION).toBeDefined();
      expect(APP_SUMMARY_PROMPT_FRAGMENTS.CONCISE_LIST).toBeDefined();
    });

    it("should use APP_SUMMARY_FRAGMENTS in app summary configs", () => {
      const appDescriptionConfig = appSummaryConfigMap.appDescription;
      const firstInstruction = appDescriptionConfig.instructions[0];

      // Should use the fragment from APP_SUMMARY_FRAGMENTS
      expect(firstInstruction).toContain(APP_SUMMARY_PROMPT_FRAGMENTS.DETAILED_DESCRIPTION);
    });
  });

  describe("Prompt Rendering Consistency", () => {
    it("should join instructions with double newlines", () => {
      const testDefinition = {
        introTextTemplate: "Intro with instructions: {{instructionsText}}",
        instructions: ["Instruction 1", "Instruction 2", "Instruction 3"] as const,
        responseSchema: z.object({ test: z.string() }),
        template: "{{introText}}",
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(testDefinition, {});

      // Instructions are joined with double newlines in the introText
      expect(rendered).toContain("Instruction 1\n\nInstruction 2\n\nInstruction 3");
    });

    it("should handle single instruction correctly", () => {
      const testDefinition = {
        introTextTemplate: "Intro with instruction: {{instructionsText}}",
        instructions: ["Single instruction"] as const,
        responseSchema: z.object({ test: z.string() }),
        template: "{{introText}}",
        dataBlockHeader: "CODE" as const,
        wrapInCodeBlock: false,
      };

      const rendered = renderPrompt(testDefinition, {});

      expect(rendered).toContain("Single instruction");
    });
  });
});

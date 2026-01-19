import {
  appSummaryConfigMap,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
  APP_SUMMARY_CONTENT_DESC,
} from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt-builders";

/**
 * Helper to create a JSONSchemaPrompt from appSummaryConfigMap config.
 * Adds contentDesc, dataBlockHeader, and wrapInCodeBlock which are no longer in the config entries.
 */
function createAppSummaryPrompt(
  category: keyof typeof appSummaryConfigMap,
  options?: { forPartialAnalysis?: boolean },
): JSONSchemaPrompt {
  const config = appSummaryConfigMap[category];
  return new JSONSchemaPrompt({
    personaIntroduction: DEFAULT_PERSONA_INTRODUCTION,
    ...config,
    contentDesc: APP_SUMMARY_CONTENT_DESC,
    dataBlockHeader: FILE_SUMMARIES_DATA_BLOCK_HEADER,
    wrapInCodeBlock: false,
    forPartialAnalysis: options?.forPartialAnalysis,
  } as JSONSchemaPromptConfig);
}

describe("App Summaries Refactoring", () => {
  describe("JSONSchemaPrompt definitions consistency", () => {
    it("should have proper instructions for all app summary categories", () => {
      // contentDesc is now set at instantiation time by the consumer
      Object.entries(appSummaryConfigMap).forEach(([, config]) => {
        // Verify that instructions contain the specific instruction text
        expect(config.instructions).toBeDefined();
        expect(config.instructions.length).toBeGreaterThan(0);
        // Instructions should contain specific text
        expect(config.instructions[0].length).toBeGreaterThan(0);
      });
    });

    it("should have proper instruction constants for refactored categories", () => {
      // Test a few specific categories that were refactored
      const technologiesConfig = appSummaryConfigMap.technologies;
      const boundedContextsConfig = appSummaryConfigMap.boundedContexts;
      const potentialMicroservicesConfig = appSummaryConfigMap.potentialMicroservices;

      // Verify instructions contain the specific instruction text
      expect(technologiesConfig.instructions[0]).toContain(
        "key external and host platform technologies",
      );
      // boundedContexts now contains hierarchical domain model with aggregates, entities, and repositories
      expect(boundedContextsConfig.instructions[0]).toContain(
        "Domain-Driven Design Bounded Contexts",
      );
      expect(potentialMicroservicesConfig.instructions[0]).toContain("microservices");
    });
  });

  describe("Unified template functionality", () => {
    it("should render JSON_SCHEMA_PROMPT_TEMPLATE for standard analysis", () => {
      const testContent = "Test file content";

      const prompt = createAppSummaryPrompt("technologies");
      const renderedPrompt = prompt.renderPrompt(testContent);

      // Verify the template structure
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("FILE_SUMMARIES:");
      expect(renderedPrompt).toContain(testContent);
      expect(renderedPrompt).toContain("```json");
      expect(renderedPrompt).toContain("```");
      // Verify no placeholder syntax remains
      expect(renderedPrompt).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should render with forPartialAnalysis flag and partial analysis note", () => {
      const testContent = "Test file content";

      // Use forPartialAnalysis flag for partial analysis
      const partialPrompt = createAppSummaryPrompt("technologies", { forPartialAnalysis: true });
      const renderedPrompt = partialPrompt.renderPrompt(testContent);

      // Verify the template structure includes partial analysis note
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("FILE_SUMMARIES:");
      expect(renderedPrompt).toContain(testContent);
      expect(renderedPrompt).toContain("partial analysis");
      expect(renderedPrompt).toContain("focus on extracting insights from this subset");
      expect(renderedPrompt).toContain("```json");
      expect(renderedPrompt).toContain("```");
    });
  });

  describe("Template consolidation", () => {
    it("should use JSON_SCHEMA_PROMPT_TEMPLATE for standard analysis", () => {
      // Verify the unified template contains the essential elements
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{content}}");
      expect(JSON_SCHEMA_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
    });

    it("should verify prompt text structure with generic contentDesc and specific instructions", () => {
      const testContent = "Test file summaries content";
      const prompt = createAppSummaryPrompt("technologies");
      const renderedPrompt = prompt.renderPrompt(testContent);

      // Verify generic contentDesc appears in template
      expect(renderedPrompt).toContain("a set of source file summaries");
      // Verify specific instruction text appears in template
      expect(renderedPrompt).toContain("key external and host platform technologies");
      // Verify content appears
      expect(renderedPrompt).toContain(testContent);
      // Verify no placeholder syntax remains
      expect(renderedPrompt).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });
  });
});

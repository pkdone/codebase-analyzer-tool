import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";
import { Prompt } from "../../../src/common/prompts/prompt";
const appSummaryPromptMetadata = appPromptManager.appSummaries;
import {
  ANALYSIS_PROMPT_TEMPLATE,
  PARTIAL_ANALYSIS_TEMPLATE,
} from "../../../src/app/prompts/app-templates";

describe("App Summaries Refactoring", () => {
  describe("Prompt definitions consistency", () => {
    it("should have generic contentDesc and specific instructions for all app summary categories", () => {
      Object.entries(appSummaryPromptMetadata).forEach(([, config]) => {
        // Verify that contentDesc is generic
        expect(config.contentDesc).toContain("a set of source file summaries");
        // Verify that instructions contain the specific instruction text
        expect(config.instructions).toBeDefined();
        expect(config.instructions.length).toBeGreaterThan(0);
        // Instructions should contain specific text
        expect(config.instructions[0].length).toBeGreaterThan(0);
        // introTextTemplate should contain generic description
        expect(config.contentDesc).toContain("a set of source file summaries");
      });
    });

    it("should have proper instruction constants for refactored categories", () => {
      // Test a few specific categories that were refactored
      const technologiesConfig = appSummaryPromptMetadata.technologies;
      const boundedContextsConfig = appSummaryPromptMetadata.boundedContexts;
      const potentialMicroservicesConfig = appSummaryPromptMetadata.potentialMicroservices;

      // Verify that contentDesc is generic
      expect(technologiesConfig.contentDesc).toContain("a set of source file summaries");
      expect(boundedContextsConfig.contentDesc).toContain("a set of source file summaries");
      expect(potentialMicroservicesConfig.contentDesc).toContain("a set of source file summaries");

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
    it("should render ANALYSIS_PROMPT_TEMPLATE for standard analysis", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file content";

      const renderedPrompt = config.renderPrompt(testContent);

      // Verify the template structure
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("FILE_SUMMARIES:");
      expect(renderedPrompt).toContain(testContent);
      expect(renderedPrompt).toContain("```json");
      expect(renderedPrompt).toContain("```");
      // Verify no placeholder syntax remains
      expect(renderedPrompt).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should render PARTIAL_ANALYSIS_TEMPLATE with partial analysis note", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file content";

      // Use PARTIAL_ANALYSIS_TEMPLATE for partial analysis
      const partialPrompt = new Prompt(
        {
          contentDesc: config.contentDesc,
          instructions: config.instructions,
          responseSchema: config.responseSchema,
          dataBlockHeader: config.dataBlockHeader,
          wrapInCodeBlock: config.wrapInCodeBlock,
        },
        PARTIAL_ANALYSIS_TEMPLATE,
      );
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
    it("should use ANALYSIS_PROMPT_TEMPLATE for standard analysis", () => {
      // Verify the unified template contains the essential elements
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(ANALYSIS_PROMPT_TEMPLATE).toContain("{{content}}");
      // partialAnalysisNote is handled via PARTIAL_ANALYSIS_TEMPLATE, not as a placeholder
      expect(ANALYSIS_PROMPT_TEMPLATE).not.toContain("{{partialAnalysisNote}}");
    });

    it("should use PARTIAL_ANALYSIS_TEMPLATE derived from ANALYSIS_PROMPT_TEMPLATE", () => {
      // PARTIAL_ANALYSIS_TEMPLATE includes the partial analysis note
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{contentDesc}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("{{instructionsText}}");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("partial analysis");
      expect(PARTIAL_ANALYSIS_TEMPLATE).toContain("focus on extracting insights from this subset");
    });

    it("should verify prompt text structure with generic contentDesc and specific instructions", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file summaries content";
      const renderedPrompt = config.renderPrompt(testContent);

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

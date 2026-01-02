import { promptRegistry } from "../../../src/app/prompts/prompt-registry";
const appSummaryPromptMetadata = promptRegistry.appSummaries;
import { BASE_PROMPT_TEMPLATE } from "../../../src/app/prompts/templates";
import { renderPrompt } from "../../../src/app/prompts/prompt-renderer";

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
    it("should render BASE_PROMPT_TEMPLATE with partialAnalysisNote parameter", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file content";
      const partialAnalysisNote = "This is a partial analysis note for testing";

      const renderedPrompt = renderPrompt(config, {
        content: testContent,
        partialAnalysisNote,
      });

      // Verify the template structure
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("FILE_SUMMARIES:");
      expect(renderedPrompt).toContain(testContent);
      expect(renderedPrompt).toContain(partialAnalysisNote);
      expect(renderedPrompt).toContain("```json");
      expect(renderedPrompt).toContain("```");
    });

    it("should render BASE_PROMPT_TEMPLATE without partialAnalysisNote parameter", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file content";

      const renderedPrompt = renderPrompt(config, { content: testContent });

      // Verify the template structure
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("FILE_SUMMARIES:");
      expect(renderedPrompt).toContain(testContent);
      expect(renderedPrompt).toContain("```json");
      expect(renderedPrompt).toContain("```");

      // Verify no placeholder syntax remains
      expect(renderedPrompt).not.toMatch(/\{\{partialAnalysisNote\}\}/);
      // When partialAnalysisNote is empty, it should not add extra whitespace
      expect(renderedPrompt).not.toMatch(/\n\n\n/); // No triple newlines
    });

    it("should handle empty partialAnalysisNote correctly", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file content";

      const renderedPrompt = renderPrompt(config, {
        content: testContent,
        partialAnalysisNote: "",
      });

      // Verify the template structure without the note
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("FILE_SUMMARIES:");
      expect(renderedPrompt).toContain(testContent);

      // Verify no placeholder syntax remains
      expect(renderedPrompt).not.toMatch(/\{\{partialAnalysisNote\}\}/);
      // When partialAnalysisNote is empty, it should not add extra whitespace
      expect(renderedPrompt).not.toMatch(/\n\n\n/); // No triple newlines
    });
  });

  describe("Template consolidation", () => {
    it("should use BASE_PROMPT_TEMPLATE that replaces both SINGLE_PASS and PARTIAL templates", () => {
      // Verify the unified template contains the essential elements
      // jsonSchema and forceJSON are now consolidated into schemaSection
      expect(BASE_PROMPT_TEMPLATE).toContain("{{contentDesc}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{instructionsText}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{dataBlockHeader}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{partialAnalysisNote}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{schemaSection}}");
      expect(BASE_PROMPT_TEMPLATE).toContain("{{content}}");
    });

    it("should verify prompt text structure with generic contentDesc and specific instructions", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file summaries content";
      const renderedPrompt = renderPrompt(config, { content: testContent });

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

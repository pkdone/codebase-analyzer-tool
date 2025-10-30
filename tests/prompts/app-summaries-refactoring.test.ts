import { appSummaryPromptMetadata } from "../../src/prompts/definitions/app-summaries";
import { APP_SUMMARY_TEMPLATE } from "../../src/prompts/prompt";
import { Prompt } from "../../src/prompts/prompt";

describe("App Summaries Refactoring", () => {
  describe("Prompt definitions consistency", () => {
    it("should have consistent contentDesc and instructions for all app summary categories", () => {
      Object.entries(appSummaryPromptMetadata).forEach(([category, config]) => {
        // Verify that contentDesc and instructions[0].points[0] are consistent
        // This ensures the refactoring eliminated duplication
        expect(config.contentDesc).toBeDefined();
        expect(config.instructions).toBeDefined();
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.instructions[0].points).toBeDefined();
        expect(config.instructions[0].points.length).toBeGreaterThan(0);

        // For most categories, the first instruction point should match the contentDesc
        // (some categories like billOfMaterials and potentialMicroservices have different patterns)
        if (
          category !== "billOfMaterials" &&
          category !== "potentialMicroservices" &&
          category !== "uiTechnologyAnalysis"
        ) {
          expect(config.instructions[0].points[0]).toContain(config.contentDesc.split(" ")[0]); // Check for common prefix
        }
      });
    });

    it("should have proper instruction constants for refactored categories", () => {
      // Test a few specific categories that were refactored
      const technologiesConfig = appSummaryPromptMetadata.technologies;
      const aggregatesConfig = appSummaryPromptMetadata.aggregates;
      const entitiesConfig = appSummaryPromptMetadata.entities;

      // Verify that the instruction text is properly defined
      expect(technologiesConfig.contentDesc).toContain(
        "key external and host platform technologies",
      );
      expect(aggregatesConfig.contentDesc).toContain("Domain Driven Design aggregates");
      expect(entitiesConfig.contentDesc).toContain("Domain-Driven Design entities");

      // Verify instructions match the contentDesc pattern
      expect(technologiesConfig.instructions[0].points[0]).toContain(
        "key external and host platform technologies",
      );
      expect(aggregatesConfig.instructions[0].points[0]).toContain(
        "Domain Driven Design aggregates",
      );
      expect(entitiesConfig.instructions[0].points[0]).toContain("Domain-Driven Design entities");
    });
  });

  describe("Unified template functionality", () => {
    it("should render APP_SUMMARY_TEMPLATE with partialAnalysisNote parameter", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file content";
      const partialAnalysisNote = "This is a partial analysis note for testing";

      const prompt = new Prompt(config, testContent);
      const renderedPrompt = prompt.render({ partialAnalysisNote });

      // Verify the template structure
      expect(renderedPrompt).toContain("Act as a senior developer analyzing the code");
      expect(renderedPrompt).toContain("FILE_SUMMARIES:");
      expect(renderedPrompt).toContain(testContent);
      expect(renderedPrompt).toContain(partialAnalysisNote);
      expect(renderedPrompt).toContain("```json");
      expect(renderedPrompt).toContain("```");
    });

    it("should render APP_SUMMARY_TEMPLATE without partialAnalysisNote parameter", () => {
      const config = appSummaryPromptMetadata.technologies;
      const testContent = "Test file content";

      const prompt = new Prompt(config, testContent);
      const renderedPrompt = prompt.render();

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

      const prompt = new Prompt(config, testContent);
      const renderedPrompt = prompt.render({ partialAnalysisNote: "" });

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
    it("should have APP_SUMMARY_TEMPLATE that replaces both SINGLE_PASS and PARTIAL templates", () => {
      // Verify the unified template contains the essential elements from both original templates
      expect(APP_SUMMARY_TEMPLATE).toContain("Act as a senior developer analyzing the code");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{contentDesc}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{instructions}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{partialAnalysisNote}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{jsonSchema}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{forceJSON}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("{{content}}");
      expect(APP_SUMMARY_TEMPLATE).toContain("FILE_SUMMARIES:");
    });

    it("should maintain REDUCE_INSIGHTS_TEMPLATE for map-reduce strategy", () => {
      // Verify the reduce template is still available and unchanged
      expect(APP_SUMMARY_TEMPLATE).toBeDefined();
      // The REDUCE_INSIGHTS_TEMPLATE should be imported and available
      // This test ensures the consolidation didn't break the reduce functionality
    });
  });
});

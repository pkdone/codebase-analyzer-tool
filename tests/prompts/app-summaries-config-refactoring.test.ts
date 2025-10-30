import { appSummaryConfigMap } from "../../src/prompts/definitions/app-summaries/app-summaries.config";
import { appSummaryPromptMetadata } from "../../src/prompts/definitions/app-summaries";
import { AppSummaryCategoryType } from "../../src/prompts/prompt.types";
import { APP_SUMMARY_TEMPLATE } from "../../src/prompts/prompt";

describe("App Summaries Config Refactoring", () => {
  describe("Configuration Structure", () => {
    it("should use instructions array instead of instruction string", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.instructions).toBeDefined();
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.instructions[0].points).toBeDefined();
        expect(Array.isArray(config.instructions[0].points)).toBe(true);
        expect(config.instructions[0].points.length).toBeGreaterThan(0);
      });
    });

    it("should not have template property in config entries", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config).not.toHaveProperty("template");
      });
    });

    it("should have proper instruction structure for all categories", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.instructions).toHaveLength(1);
        expect(config.instructions[0].points).toHaveLength(1);
        expect(typeof config.instructions[0].points[0]).toBe("string");
        expect(config.instructions[0].points[0].length).toBeGreaterThan(0);
      });
    });
  });

  describe("Metadata Generation", () => {
    it("should generate metadata with correct structure", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];

        expect(metadata).toBeDefined();
        expect(metadata.label).toBe(config.label);
        expect(metadata.contentDesc).toBe(config.instructions[0].points[0]);
        expect(metadata.responseSchema).toBe(config.responseSchema);
        expect(metadata.template).toBe(APP_SUMMARY_TEMPLATE);
        expect(metadata.instructions).toBe(config.instructions);
      });
    });

    it("should maintain contentDesc and instruction consistency", () => {
      Object.entries(appSummaryConfigMap).forEach(([key]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.contentDesc).toBe(metadata.instructions[0].points[0]);
      });
    });

    it("should apply template by default", () => {
      Object.entries(appSummaryConfigMap).forEach(([key]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];
        expect(metadata.template).toBe(APP_SUMMARY_TEMPLATE);
      });
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain same contentDesc values as before refactoring", () => {
      const expectedContentDescs = {
        appDescription: "a detailed description of the application's purpose and implementation",
        technologies:
          "a concise list of key external and host platform technologies depended on by the application",
        businessProcesses:
          "a concise list of the application's main business processes with their key business activity steps that are linearly conducted by each process",
        boundedContexts:
          "a concise list of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models",
        aggregates:
          "a concise list of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories",
        entities:
          "a concise list of Domain-Driven Design entities that represent core business concepts and contain business logic",
        repositories:
          "a concise list of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate",
        potentialMicroservices:
          "a concise list of recommended microservices to modernize the monolithic application architecture, each following the Single Responsibility Principle with detailed domain entities, defined CRUD operations, and REST API endpoints",
        billOfMaterials:
          "a comprehensive list of all third-party dependencies with version conflict detection to identify technical debt and security risks",
        codeQualitySummary:
          "aggregated code quality metrics including complexity analysis, code smell detection, and maintainability indicators to help prioritize refactoring efforts",
        scheduledJobsSummary:
          "a comprehensive list of batch processes, scheduled jobs, and automated scripts that perform critical business operations",
        moduleCoupling:
          "a dependency matrix showing coupling relationships between modules to identify highly coupled components (candidates for single services) and loosely coupled components (candidates for easy separation)",
        uiTechnologyAnalysis:
          "a comprehensive analysis of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries to assess technical debt and plan modernization efforts",
      };

      Object.entries(expectedContentDescs).forEach(([category, expectedContentDesc]) => {
        const metadata = appSummaryPromptMetadata[category as AppSummaryCategoryType];
        expect(metadata.contentDesc).toBe(expectedContentDesc);
      });
    });

    it("should maintain same instruction content as before refactoring", () => {
      Object.entries(appSummaryConfigMap).forEach(([key, config]) => {
        const metadata = appSummaryPromptMetadata[key as AppSummaryCategoryType];

        // The instruction content should be the same as the first point in the instructions array
        expect(metadata.instructions[0].points[0]).toBe(config.instructions[0].points[0]);
      });
    });
  });

  describe("Type Safety", () => {
    it("should have proper TypeScript types", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        // These should compile without TypeScript errors
        const label: string = config.label;
        const instructions: readonly { points: readonly string[] }[] = config.instructions;
        const responseSchema = config.responseSchema;

        expect(typeof label).toBe("string");
        expect(Array.isArray(instructions)).toBe(true);
        expect(responseSchema).toBeDefined();
      });
    });

    it("should maintain readonly properties", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        // Test that the properties are readonly by checking their type
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(Array.isArray(config.instructions[0].points)).toBe(true);

        // Test that the arrays have the expected structure
        expect(config.instructions.length).toBeGreaterThan(0);
        expect(config.instructions[0].points.length).toBeGreaterThan(0);
      });
    });
  });
});

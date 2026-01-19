import { z } from "zod";
import {
  CODE_DATA_BLOCK_HEADER,
  FILE_SUMMARIES_DATA_BLOCK_HEADER,
} from "../../../src/app/prompts/prompts.constants";
import { appSummaryConfigMap } from "../../../src/app/prompts/app-summaries/app-summaries.definitions";
import { APP_SUMMARY_CONTENT_DESC } from "../../../src/app/prompts/app-summaries/app-summaries.constants";
import { fileTypePromptRegistry } from "../../../src/app/prompts/sources/sources.definitions";
import {
  JSONSchemaPrompt,
  type JSONSchemaPromptConfig,
} from "../../../src/common/prompts/json-schema-prompt";
import { DEFAULT_PERSONA_INTRODUCTION } from "../../../src/app/prompts/prompt-builders";
import type { SourceConfigEntry } from "../../../src/app/prompts/sources/definitions/source-config-factories";

/**
 * Helper function to get schema field names from a config entry.
 * Since responseSchema is now a ZodObject, we can extract field names from its shape.
 */
function getSchemaFields(
  config: (typeof fileTypePromptRegistry)[keyof typeof fileTypePromptRegistry],
): string[] {
  const schema = config.responseSchema as z.ZodObject<z.ZodRawShape>;
  return Object.keys(schema.shape);
}

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

describe("Data-driven JSONSchemaPrompt System", () => {
  describe("Source config structure", () => {
    it("should have all file types in configuration", () => {
      const configFileTypes = Object.keys(fileTypePromptRegistry);

      // All standard file types should be present
      expect(configFileTypes).toContain("java");
      expect(configFileTypes).toContain("javascript");
      expect(configFileTypes).toContain("python");
      expect(configFileTypes).toContain("default");
    });

    it("should have consistent config structure for all file types", () => {
      Object.entries(fileTypePromptRegistry).forEach(([, config]) => {
        expect(config.contentDesc).toBeDefined();
        expect(config.instructions).toBeDefined();
        expect(config.responseSchema).toBeDefined();
        // dataBlockHeader and wrapInCodeBlock are now set at instantiation time
        // and are not part of the registry entries
      });
    });

    it("should properly pick schema fields from master schema", () => {
      const javaConfig = fileTypePromptRegistry.java;

      // The schema should be a picked version with the specified fields
      expect(javaConfig.responseSchema).toBeDefined();
      expect(typeof javaConfig.responseSchema.parse).toBe("function");

      // Check that the schema fields match the configuration
      const schemaFields = getSchemaFields(javaConfig);
      expect(schemaFields).toContain("name");
      expect(schemaFields).toContain("purpose");
      expect(schemaFields).toContain("databaseIntegration");
    });

    it("should have hasComplexSchema in source config entries", () => {
      // Standard code configs don't explicitly set hasComplexSchema (defaults to false at usage site)
      // Use type assertion to SourceConfigEntry to access the optional property
      expect((fileTypePromptRegistry.java as SourceConfigEntry).hasComplexSchema).toBeUndefined();
      expect(
        (fileTypePromptRegistry.javascript as SourceConfigEntry).hasComplexSchema,
      ).toBeUndefined();
      expect((fileTypePromptRegistry.python as SourceConfigEntry).hasComplexSchema).toBeUndefined();

      // Special file types using createCompositeSourceConfig explicitly set hasComplexSchema: false
      expect((fileTypePromptRegistry.markdown as SourceConfigEntry).hasComplexSchema).toBe(false);

      // Dependency configs have hasComplexSchema: true (set by createDependencyConfig)
      expect(fileTypePromptRegistry.maven.hasComplexSchema).toBe(true);

      // SQL has hasComplexSchema: true (complex database object schema)
      expect(fileTypePromptRegistry.sql.hasComplexSchema).toBe(true);
    });
  });

  describe("App summary config structure", () => {
    it("should have all categories in configuration", () => {
      const configCategories = Object.keys(appSummaryConfigMap);

      // appSummaryConfigMap is used directly now, no separate generated metadata
      configCategories.forEach((category) => {
        expect(appSummaryConfigMap[category as keyof typeof appSummaryConfigMap]).toBeDefined();
      });
    });

    it("should have consistent structure in configs", () => {
      // contentDesc, dataBlockHeader, wrapInCodeBlock are no longer in config entries
      // They are set at instantiation time by the consumer (InsightCompletionExecutor)
      Object.entries(appSummaryConfigMap).forEach(([, config]) => {
        expect(config.responseSchema).toBeDefined();
        expect(config.instructions).toBeDefined();
        expect(Array.isArray(config.instructions)).toBe(true);
      });
    });

    it("should properly structure instructions", () => {
      Object.values(appSummaryConfigMap).forEach((config) => {
        expect(config.instructions).toBeDefined();
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.instructions.length).toBe(1); // App summaries have single instruction section
        expect(config.instructions[0]).toBeDefined();
        expect(typeof config.instructions[0]).toBe("string");
        expect(config.instructions[0].length).toBeGreaterThan(0); // Single instruction string
      });
    });
  });

  describe("JSONSchemaPrompt rendering consistency", () => {
    it("should render all source file types with JSON_SCHEMA_PROMPT_TEMPLATE structure", () => {
      // All source file types should render with the standard template
      Object.keys(fileTypePromptRegistry).forEach((fileType) => {
        const prompt = createSourcePrompt(fileType as keyof typeof fileTypePromptRegistry);
        const rendered = prompt.renderPrompt("test");
        expect(rendered).toContain("Act as a senior developer");
      });
    });

    it("should render app summary configs with JSON_SCHEMA_PROMPT_TEMPLATE structure", () => {
      // All app summary configs should be rendered with JSON_SCHEMA_PROMPT_TEMPLATE
      Object.keys(appSummaryConfigMap).forEach((categoryKey) => {
        const prompt = createAppSummaryPrompt(categoryKey as keyof typeof appSummaryConfigMap);
        const rendered = prompt.renderPrompt("test");
        // Should contain template markers rendered
        expect(rendered).toContain("Act as a senior developer");
      });
    });
  });

  describe("Instruction composition", () => {
    it("should properly compose instruction sections", () => {
      const javaConfig = fileTypePromptRegistry.java;

      // Java should have multiple instruction sections
      expect(javaConfig.instructions.length).toBeGreaterThan(1);

      // Each instruction should be a string
      javaConfig.instructions.forEach((instruction: string) => {
        expect(typeof instruction).toBe("string");
        expect(instruction.length).toBeGreaterThan(0);
      });
    });

    it("should include appropriate instruction sections for different file types", () => {
      // Java should have code quality instructions
      const javaInstructions = fileTypePromptRegistry.java.instructions;
      const javaInstructionText = javaInstructions.join(" ");
      expect(javaInstructionText).toContain("Code Quality Analysis");

      // Markdown should not have complex code quality instructions
      const markdownInstructions = fileTypePromptRegistry.markdown.instructions;
      const markdownInstructionText = markdownInstructions.join(" ");
      // Markdown files are documentation and don't include code quality metrics
      expect(markdownInstructionText).not.toContain("cyclomaticComplexity");
    });
  });

  describe("Schema field validation", () => {
    it("should include all required fields for complex file types", () => {
      const javaConfig = fileTypePromptRegistry.java;
      const schemaFields = getSchemaFields(javaConfig);
      const expectedFields = [
        "name",
        "kind",
        "namespace",
        "purpose",
        "implementation",
        "internalReferences",
        "externalReferences",
        "publicConstants",
        "publicFunctions",
        "databaseIntegration",
        "integrationPoints",
        "codeQualityMetrics",
      ];

      expectedFields.forEach((field) => {
        expect(schemaFields).toContain(field);
      });
    });

    it("should have appropriate field sets for different file types", () => {
      // SQL should have database-specific fields
      const sqlConfig = fileTypePromptRegistry.sql;
      const sqlFields = getSchemaFields(sqlConfig);
      expect(sqlFields).toContain("databaseIntegration");

      // Maven should have simpler field set (build files don't have "name" field)
      const mavenConfig = fileTypePromptRegistry.maven;
      const mavenFields = getSchemaFields(mavenConfig);
      expect(mavenFields).toContain("purpose");
      expect(mavenFields).toContain("dependencies"); // Build files store dependencies directly
    });
  });

  describe("Configuration completeness", () => {
    it("should have all required file types in source configuration", () => {
      const expectedFileTypes = [
        "java",
        "javascript",
        "csharp",
        "python",
        "ruby",
        "sql",
        "markdown",
        "xml",
        "jsp",
        "maven",
        "gradle",
        "ant",
        "npm",
        "dotnet-proj",
        "nuget",
        "ruby-bundler",
        "python-pip",
        "python-setup",
        "python-poetry",
        "shell-script",
        "batch-script",
        "jcl",
        "default",
      ];

      expectedFileTypes.forEach((fileType) => {
        expect(
          fileTypePromptRegistry[fileType as keyof typeof fileTypePromptRegistry],
        ).toBeDefined();
      });
    });

    it("should have all required categories in app summary configuration", () => {
      const expectedCategories: (keyof typeof appSummaryConfigMap)[] = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "potentialMicroservices",
      ];

      expectedCategories.forEach((category) => {
        expect(appSummaryConfigMap[category]).toBeDefined();
      });
    });
  });
});

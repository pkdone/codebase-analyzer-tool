import { fileTypePromptMetadata } from "../../src/prompts/definitions/sources";
import { appSummaryPromptMetadata } from "../../src/prompts/definitions/app-summaries";
import { sourceConfigMap } from "../../src/prompts/definitions/sources/sources.config";
import { appSummaryConfigMap } from "../../src/prompts/definitions/app-summaries/app-summaries.config";

describe("Data-driven Prompt System", () => {
  describe("Source prompt generation", () => {
    it("should generate all file types from configuration", () => {
      const configFileTypes = Object.keys(sourceConfigMap);
      const generatedFileTypes = Object.keys(fileTypePromptMetadata);

      expect(generatedFileTypes.length).toBe(configFileTypes.length);
      configFileTypes.forEach((fileType) => {
        expect(generatedFileTypes).toContain(fileType);
      });
    });

    it("should have consistent structure between config and generated metadata", () => {
      Object.entries(sourceConfigMap).forEach(([fileType, config]) => {
        const metadata = fileTypePromptMetadata[fileType as keyof typeof fileTypePromptMetadata];

        expect(metadata.contentDesc).toBe(config.contentDesc);
        expect(metadata.hasComplexSchema).toBe(config.hasComplexSchema ?? true);
        expect(metadata.template).toBeDefined(); // Template is assigned in generatePromptMetadata
        expect(metadata.instructions).toEqual(config.instructions);
      });
    });

    it("should properly pick schema fields from master schema", () => {
      const javaMetadata = fileTypePromptMetadata.java;
      const javaConfig = sourceConfigMap.java;

      // The schema should be a picked version with the specified fields
      expect(javaMetadata.responseSchema).toBeDefined();
      expect(typeof javaMetadata.responseSchema.parse).toBe("function");

      // Check that the schema fields match the configuration
      expect(javaConfig.schemaFields).toContain("name");
      expect(javaConfig.schemaFields).toContain("purpose");
      expect(javaConfig.schemaFields).toContain("databaseIntegration");
    });

    it("should handle different complexity levels correctly", () => {
      // Complex schemas
      expect(fileTypePromptMetadata.java.hasComplexSchema).toBe(true);
      expect(fileTypePromptMetadata.javascript.hasComplexSchema).toBe(true);
      expect(fileTypePromptMetadata.python.hasComplexSchema).toBe(true);

      // Simple schemas (default to true when undefined)
      expect(fileTypePromptMetadata.markdown.hasComplexSchema).toBe(true);
      expect(fileTypePromptMetadata.maven.hasComplexSchema).toBe(true);
    });
  });

  describe("App summary prompt generation", () => {
    it("should generate all categories from configuration", () => {
      const configCategories = Object.keys(appSummaryConfigMap);
      const generatedCategories = Object.keys(appSummaryPromptMetadata);

      expect(generatedCategories.length).toBe(configCategories.length);
      configCategories.forEach((category) => {
        expect(generatedCategories).toContain(category);
      });
    });

    it("should have consistent structure between config and generated metadata", () => {
      Object.entries(appSummaryConfigMap).forEach(([category, config]) => {
        const metadata = appSummaryPromptMetadata[category];

        expect(metadata.label).toBe(config.label);
        expect(metadata.contentDesc).toBe("a set of source file summaries"); // Generic contentDesc
        expect(metadata.template).toBeDefined();
        expect(metadata.responseSchema).toBe(config.responseSchema);
        // Instructions should be built from config.contentDesc
        expect(metadata.instructions[0]).toBe(config.contentDesc);
      });
    });

    it("should properly structure instructions", () => {
      Object.values(appSummaryPromptMetadata).forEach((metadata) => {
        expect(metadata.instructions).toBeDefined();
        expect(Array.isArray(metadata.instructions)).toBe(true);
        expect(metadata.instructions.length).toBe(1); // App summaries have single instruction section
        expect(metadata.instructions[0]).toBeDefined();
        expect(typeof metadata.instructions[0]).toBe("string");
        expect(metadata.instructions[0].length).toBeGreaterThan(0); // Single instruction string
      });
    });
  });

  describe("Template consistency", () => {
    it("should use consistent templates across source file types", () => {
      const templates = Object.values(fileTypePromptMetadata).map((metadata) => metadata.template);
      const uniqueTemplates = [...new Set(templates)];

      // All source file types should use the same template
      expect(uniqueTemplates.length).toBe(1);
    });

    it("should use consistent templates across app summary categories", () => {
      const templates = Object.values(appSummaryPromptMetadata).map(
        (metadata) => metadata.template,
      );
      const uniqueTemplates = [...new Set(templates)];

      // All app summary categories should use the same template
      expect(uniqueTemplates.length).toBe(1);
    });
  });

  describe("Instruction composition", () => {
    it("should properly compose instruction sections", () => {
      const javaMetadata = fileTypePromptMetadata.java;

      // Java should have multiple instruction sections
      expect(javaMetadata.instructions.length).toBeGreaterThan(1);

      // Each instruction should be a string
      javaMetadata.instructions.forEach((instruction: string) => {
        expect(typeof instruction).toBe("string");
        expect(instruction.length).toBeGreaterThan(0);
      });
    });

    it("should include appropriate instruction sections for different file types", () => {
      // Java should have code quality instructions
      const javaInstructions = fileTypePromptMetadata.java.instructions;
      const javaInstructionText = javaInstructions.join(" ");
      expect(javaInstructionText).toContain("Code Quality Analysis");

      // Markdown should not have complex code quality instructions
      const markdownInstructions = fileTypePromptMetadata.markdown.instructions;
      const markdownInstructionText = markdownInstructions.join(" ");
      // Markdown files are documentation and don't include code quality metrics
      expect(markdownInstructionText).not.toContain("cyclomaticComplexity");
    });
  });

  describe("Schema field validation", () => {
    it("should include all required fields for complex file types", () => {
      const javaConfig = sourceConfigMap.java;
      const expectedFields = [
        "name",
        "kind",
        "namespace",
        "purpose",
        "implementation",
        "internalReferences",
        "externalReferences",
        "publicConstants",
        "publicMethods",
        "databaseIntegration",
        "integrationPoints",
        "codeQualityMetrics",
      ];

      expectedFields.forEach((field) => {
        expect(javaConfig.schemaFields).toContain(field);
      });
    });

    it("should have appropriate field sets for different file types", () => {
      // SQL should have database-specific fields
      const sqlConfig = sourceConfigMap.sql;
      expect(sqlConfig.schemaFields).toContain("databaseIntegration");

      // Maven should have simpler field set (build files don't have "name" field)
      const mavenConfig = sourceConfigMap.maven;
      expect(mavenConfig.schemaFields).toContain("purpose");
      expect(mavenConfig.schemaFields).toContain("dependencies"); // Build files store dependencies directly
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
        expect(sourceConfigMap[fileType as keyof typeof sourceConfigMap]).toBeDefined();
      });
    });

    it("should have all required categories in app summary configuration", () => {
      const expectedCategories = [
        "appDescription",
        "technologies",
        "businessProcesses",
        "boundedContexts",
        "aggregates",
        "entities",
        "repositories",
        "potentialMicroservices",
      ];

      expectedCategories.forEach((category) => {
        expect(appSummaryConfigMap[category]).toBeDefined();
      });
    });
  });
});

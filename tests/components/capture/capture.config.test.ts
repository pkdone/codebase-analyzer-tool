import { fileTypePromptMetadata } from "../../../src/prompts/definitions/sources";
import { sourceConfigMap } from "../../../src/prompts/definitions/sources/sources.config";
import { InstructionSection } from "../../../src/prompts/prompt.types";

describe("fileTypeMetadataConfig", () => {
  describe("supported file types", () => {
    it("should have configurations for all expected file types", () => {
      const expectedTypes: (keyof typeof fileTypePromptMetadata)[] = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "ruby",
      ];

      for (const type of expectedTypes) {
        expect(fileTypePromptMetadata[type]).toBeDefined();
        expect(fileTypePromptMetadata[type]).toHaveProperty("contentDesc");
        expect(fileTypePromptMetadata[type]).toHaveProperty("instructions");
        expect(fileTypePromptMetadata[type]).toHaveProperty("responseSchema");
        expect(fileTypePromptMetadata[type]).toHaveProperty("hasComplexSchema");
      }
    });

    it("should always have a default configuration", () => {
      const defaultConfig = fileTypePromptMetadata.default;
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.contentDesc).toBe("source files");
      expect(typeof defaultConfig.instructions).toBe("object");
      expect(Array.isArray(defaultConfig.instructions)).toBe(true);
      expect(defaultConfig.responseSchema).toBeDefined();
      expect(
        defaultConfig.hasComplexSchema === undefined ||
          typeof defaultConfig.hasComplexSchema === "boolean",
      ).toBe(true);
    });
  });

  describe("java configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.java.contentDesc).toBe("JVM code");
    });

    it("should be marked as complex schema", () => {
      expect(fileTypePromptMetadata.java.hasComplexSchema).toBe(true);
    });

    it("should include expected instructions", () => {
      const instructions = fileTypePromptMetadata.java.instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("namespace");
      expect(instructionText).toContain("public methods");
      expect(instructionText).toContain("database integration");
      expect(instructionText).toContain("internal references");
      expect(instructionText).toContain("external references");
    });

    it("should have a valid schema", () => {
      expect(fileTypePromptMetadata.java.responseSchema).toBeDefined();
      expect(typeof fileTypePromptMetadata.java.responseSchema.parse).toBe("function");
    });
  });

  describe("javascript configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.javascript.contentDesc).toBe("JavaScript/TypeScript code");
    });

    it("should be marked as complex schema", () => {
      expect(fileTypePromptMetadata.javascript.hasComplexSchema).toBe(true);
    });

    it("should include expected instructions", () => {
      const instructions = fileTypePromptMetadata.javascript.instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("purpose");
      expect(instructionText).toContain("implementation");
      expect(instructionText).toContain("internal references");
    });
  });

  describe("sql configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.sql.contentDesc).toBe("database DDL/DML/SQL code");
    });

    it("should be marked as complex schema", () => {
      expect(fileTypePromptMetadata.sql.hasComplexSchema).toBe(true);
    });

    it("should include SQL-specific instructions", () => {
      const instructions = fileTypePromptMetadata.sql.instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("stored procedure");
      expect(instructionText).toContain("triggers");
      expect(instructionText).toContain("tables");
    });

    it("should have a valid schema", () => {
      expect(fileTypePromptMetadata.sql.responseSchema).toBeDefined();
      expect(typeof fileTypePromptMetadata.sql.responseSchema.parse).toBe("function");
    });
  });

  describe("csharp configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.csharp.contentDesc).toBe("C# code");
    });

    it("should be marked as complex schema", () => {
      expect(fileTypePromptMetadata.csharp.hasComplexSchema).toBe(true);
    });

    it("should include C#-specific instructions", () => {
      const instructions = fileTypePromptMetadata.csharp.instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("Entity Framework");
      expect(instructionText).toContain("Dapper");
      expect(instructionText).toContain("async/sync");
    });
  });

  describe("ruby configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.ruby.contentDesc).toBe("Ruby code");
    });

    it("should be marked as complex schema", () => {
      expect(fileTypePromptMetadata.ruby.hasComplexSchema).toBe(true);
    });

    it("should include Ruby-specific instructions", () => {
      const instructions = fileTypePromptMetadata.ruby.instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("ActiveRecord");
      expect(instructionText).toContain("module");
    });
  });

  describe("maven configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.maven.contentDesc).toBe(
        "Maven POM (Project Object Model) build file",
      );
    });

    it("should include dependencies in schema fields", () => {
      const config = sourceConfigMap.maven;
      expect(config.schemaFields).toContain("dependencies");
      expect(config.schemaFields).not.toContain("internalReferences");
      expect(config.schemaFields).not.toContain("externalReferences");
      expect(config.schemaFields).not.toContain("integrationPoints");
      expect(config.schemaFields).not.toContain("databaseIntegration");
    });

    it("should have only BASIC_INFO and REFERENCES_AND_DEPS instruction sections", () => {
      const instructions = fileTypePromptMetadata.maven.instructions;
      expect(instructions.length).toBe(2);
      expect(instructions[0].title).toBe("Basic Information");
      expect(instructions[1].title).toBe("References and Dependencies");

      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("POM file");
    });
  });

  describe("gradle configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.gradle.contentDesc).toBe("Gradle build configuration file");
    });

    it("should include dependencies in schema fields", () => {
      const config = sourceConfigMap.gradle;
      expect(config.schemaFields).toContain("dependencies");
      expect(config.schemaFields).not.toContain("internalReferences");
      expect(config.schemaFields).not.toContain("externalReferences");
    });

    it("should have dependency extraction instructions", () => {
      const instructions = fileTypePromptMetadata.gradle.instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("Groovy DSL");
      expect(instructionText).toContain("Kotlin DSL");
    });
  });

  describe("npm configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata.npm.contentDesc).toBe("npm package.json or lock file");
    });

    it("should include dependencies in schema fields", () => {
      const config = sourceConfigMap.npm;
      expect(config.schemaFields).toContain("dependencies");
      expect(config.schemaFields).not.toContain("internalReferences");
      expect(config.schemaFields).not.toContain("externalReferences");
    });

    it("should have dependency extraction instructions for npm", () => {
      const instructions = fileTypePromptMetadata.npm.instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("package name");
      expect(instructionText).toContain("version");
    });
  });

  describe("python-pip configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptMetadata["python-pip"].contentDesc).toBe(
        "Python requirements.txt or Pipfile",
      );
    });

    it("should include dependencies in schema fields", () => {
      const config = sourceConfigMap["python-pip"];
      expect(config.schemaFields).toContain("dependencies");
      expect(config.schemaFields).not.toContain("internalReferences");
      expect(config.schemaFields).not.toContain("externalReferences");
    });

    it("should have dependency extraction instructions for pip", () => {
      const instructions = fileTypePromptMetadata["python-pip"].instructions;
      const instructionArray = instructions.flatMap(
        (section: InstructionSection) => section.points,
      );
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("Pipfile");
      expect(instructionText).toContain("version specifier");
    });
  });

  describe("configuration structure", () => {
    it("should have all configurations with required properties", () => {
      for (const config of Object.values(fileTypePromptMetadata)) {
        expect(config).toBeDefined();
        expect(typeof config.contentDesc).toBe("string");
        expect(typeof config.instructions).toBe("object");
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.responseSchema).toBeDefined();
        expect(
          config.hasComplexSchema === undefined || typeof config.hasComplexSchema === "boolean",
        ).toBe(true);
      }
    });

    it("should have non-empty instructions for all types", () => {
      for (const config of Object.values(fileTypePromptMetadata)) {
        expect(config.instructions.length).toBeGreaterThan(0);
      }
    });
  });

  describe("type safety", () => {
    it("should be defined as const object with all required properties", () => {
      // Verify the config object structure is correct
      expect(fileTypePromptMetadata).toBeDefined();
      expect(fileTypePromptMetadata.java).toBeDefined();
      expect(fileTypePromptMetadata.default).toBeDefined();
    });

    it("should maintain configuration integrity", () => {
      // Verify configurations maintain their expected values
      expect(fileTypePromptMetadata.java.contentDesc).toBe("JVM code");
      expect(fileTypePromptMetadata.default.contentDesc).toBe("source files");
      expect(fileTypePromptMetadata.sql.hasComplexSchema).toBe(true);
    });
  });
});

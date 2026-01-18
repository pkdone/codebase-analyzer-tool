import { z } from "zod";
import { fileTypePromptRegistry } from "../../../../src/app/prompts/sources/sources.definitions";

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

describe("fileTypePromptRegistry", () => {
  describe("supported file types", () => {
    it("should have configurations for all expected file types", () => {
      const expectedTypes: (keyof typeof fileTypePromptRegistry)[] = [
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
        expect(fileTypePromptRegistry[type]).toBeDefined();
        expect(fileTypePromptRegistry[type]).toHaveProperty("contentDesc");
        expect(fileTypePromptRegistry[type]).toHaveProperty("instructions");
        expect(fileTypePromptRegistry[type]).toHaveProperty("responseSchema");
      }
    });

    it("should always have a default configuration", () => {
      const defaultConfig = fileTypePromptRegistry.default;
      expect(defaultConfig).toBeDefined();
      expect(defaultConfig.contentDesc).toContain("source files");
      expect(typeof defaultConfig.instructions).toBe("object");
      expect(Array.isArray(defaultConfig.instructions)).toBe(true);
      expect(defaultConfig.responseSchema).toBeDefined();
    });
  });

  describe("java configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.java.contentDesc).toContain("JVM code");
    });

    it("should use default hasComplexSchema (undefined = false)", () => {
      // Standard code configs don't explicitly set hasComplexSchema, so it defaults to false at usage site
      expect(fileTypePromptRegistry.java.hasComplexSchema).toBeUndefined();
    });

    it("should include expected instructions", () => {
      const instructions = fileTypePromptRegistry.java.instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("namespace");
      expect(instructionText).toContain("public methods");
      expect(instructionText).toContain("database integration");
      expect(instructionText).toContain("internal references");
      expect(instructionText).toContain("external references");
    });

    it("should have a valid schema", () => {
      expect(fileTypePromptRegistry.java.responseSchema).toBeDefined();
      expect(typeof fileTypePromptRegistry.java.responseSchema.parse).toBe("function");
    });
  });

  describe("javascript configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.javascript.contentDesc).toContain("JavaScript/TypeScript code");
    });

    it("should use default hasComplexSchema (undefined = false)", () => {
      // Standard code configs don't explicitly set hasComplexSchema, so it defaults to false at usage site
      expect(fileTypePromptRegistry.javascript.hasComplexSchema).toBeUndefined();
    });

    it("should include expected instructions", () => {
      const instructions = fileTypePromptRegistry.javascript.instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("purpose");
      expect(instructionText).toContain("implementation");
      expect(instructionText).toContain("internal references");
    });
  });

  describe("sql configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.sql.contentDesc).toContain("database DDL/DML/SQL code");
    });

    it("should have hasComplexSchema explicitly set to true", () => {
      // SQL config has complex schema due to database object definitions
      expect(fileTypePromptRegistry.sql.hasComplexSchema).toBe(true);
    });

    it("should include SQL-specific instructions", () => {
      const instructions = fileTypePromptRegistry.sql.instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("stored procedure");
      expect(instructionText).toContain("triggers");
      expect(instructionText).toContain("tables");
    });

    it("should have a valid schema", () => {
      expect(fileTypePromptRegistry.sql.responseSchema).toBeDefined();
      expect(typeof fileTypePromptRegistry.sql.responseSchema.parse).toBe("function");
    });
  });

  describe("csharp configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.csharp.contentDesc).toContain("C# code");
    });

    it("should use default hasComplexSchema (undefined = false)", () => {
      // Standard code configs don't explicitly set hasComplexSchema, so it defaults to false at usage site
      expect(fileTypePromptRegistry.csharp.hasComplexSchema).toBeUndefined();
    });

    it("should include C#-specific instructions", () => {
      const instructions = fileTypePromptRegistry.csharp.instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("Entity Framework");
      expect(instructionText).toContain("Dapper");
      expect(instructionText).toContain("async/sync");
    });
  });

  describe("ruby configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.ruby.contentDesc).toContain("Ruby code");
    });

    it("should use default hasComplexSchema (undefined = false)", () => {
      // Standard code configs don't explicitly set hasComplexSchema, so it defaults to false at usage site
      expect(fileTypePromptRegistry.ruby.hasComplexSchema).toBeUndefined();
    });

    it("should include Ruby-specific instructions", () => {
      const instructions = fileTypePromptRegistry.ruby.instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("ActiveRecord");
      expect(instructionText).toContain("module");
    });
  });

  describe("maven configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.maven.contentDesc).toContain(
        "Maven POM (Project Object Model) build file",
      );
    });

    it("should include dependencies in schema fields", () => {
      const config = fileTypePromptRegistry.maven;
      const schemaFields = getSchemaFields(config);
      expect(schemaFields).toContain("dependencies");
      expect(schemaFields).not.toContain("internalReferences");
      expect(schemaFields).not.toContain("externalReferences");
      expect(schemaFields).not.toContain("integrationPoints");
      expect(schemaFields).not.toContain("databaseIntegration");
    });

    it("should have only BASIC_INFO and REFERENCES_AND_DEPS instruction sections", () => {
      const instructions = fileTypePromptRegistry.maven.instructions;
      expect(instructions.length).toBe(2);
      // Instructions now contain formatted strings with titles
      expect(instructions[0]).toContain("Basic Information");
      expect(instructions[1]).toContain("References and Dependencies");

      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("POM file");
    });
  });

  describe("gradle configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.gradle.contentDesc).toContain(
        "Gradle build configuration file",
      );
    });

    it("should include dependencies in schema fields", () => {
      const config = fileTypePromptRegistry.gradle;
      const schemaFields = getSchemaFields(config);
      expect(schemaFields).toContain("dependencies");
      expect(schemaFields).not.toContain("internalReferences");
      expect(schemaFields).not.toContain("externalReferences");
    });

    it("should have dependency extraction instructions", () => {
      const instructions = fileTypePromptRegistry.gradle.instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("Groovy DSL");
      expect(instructionText).toContain("Kotlin DSL");
    });
  });

  describe("npm configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry.npm.contentDesc).toContain("npm package.json or lock file");
    });

    it("should include dependencies in schema fields", () => {
      const config = fileTypePromptRegistry.npm;
      const schemaFields = getSchemaFields(config);
      expect(schemaFields).toContain("dependencies");
      expect(schemaFields).not.toContain("internalReferences");
      expect(schemaFields).not.toContain("externalReferences");
    });

    it("should have dependency extraction instructions for npm", () => {
      const instructions = fileTypePromptRegistry.npm.instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("package name");
      expect(instructionText).toContain("version");
    });
  });

  describe("python-pip configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypePromptRegistry["python-pip"].contentDesc).toContain(
        "Python requirements.txt or Pipfile",
      );
    });

    it("should include dependencies in schema fields", () => {
      const config = fileTypePromptRegistry["python-pip"];
      const schemaFields = getSchemaFields(config);
      expect(schemaFields).toContain("dependencies");
      expect(schemaFields).not.toContain("internalReferences");
      expect(schemaFields).not.toContain("externalReferences");
    });

    it("should have dependency extraction instructions for pip", () => {
      const instructions = fileTypePromptRegistry["python-pip"].instructions;
      const instructionText = instructions.join(" ");
      expect(instructionText).toContain("dependencies");
      expect(instructionText).toContain("Pipfile");
      expect(instructionText).toContain("version specifier");
    });
  });

  describe("configuration structure", () => {
    it("should have all configurations with required properties", () => {
      for (const config of Object.values(fileTypePromptRegistry)) {
        expect(config).toBeDefined();
        expect(typeof config.contentDesc).toContain("string");
        expect(typeof config.instructions).toBe("object");
        expect(Array.isArray(config.instructions)).toBe(true);
        expect(config.responseSchema).toBeDefined();
      }
    });

    it("should have non-empty instructions for all types", () => {
      for (const config of Object.values(fileTypePromptRegistry)) {
        expect(config.instructions.length).toBeGreaterThan(0);
      }
    });
  });

  describe("type safety", () => {
    it("should be defined as const object with all required properties", () => {
      // Verify the config object structure is correct
      expect(fileTypePromptRegistry).toBeDefined();
      expect(fileTypePromptRegistry.java).toBeDefined();
      expect(fileTypePromptRegistry.default).toBeDefined();
    });

    it("should maintain configuration integrity", () => {
      // Verify configurations maintain their expected values
      expect(fileTypePromptRegistry.java.contentDesc).toContain("JVM code");
      expect(fileTypePromptRegistry.default.contentDesc).toContain("source files");
      // hasComplexSchema defaults to false (undefined in config, default at usage site)
      expect(fileTypePromptRegistry.java.hasComplexSchema).toBeUndefined();
    });
  });
});

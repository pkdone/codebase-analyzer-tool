import { fileTypePromptMetadata } from "../../../src/prompts/templates/sources.prompts";
import { areInstructionSections } from "../../../src/prompts/types/prompt-definition.types";

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
      expect(defaultConfig.contentDesc).toBe("project file content");
      expect(typeof defaultConfig.instructions).toBe("object");
      expect(Array.isArray(defaultConfig.instructions)).toBe(true);
      expect(defaultConfig.responseSchema).toBeDefined();
      expect(typeof defaultConfig.hasComplexSchema).toBe("boolean");
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
      const instructionArray = areInstructionSections(instructions)
        ? instructions.flatMap((section) => section.points)
        : instructions;
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
      const instructionArray = areInstructionSections(instructions)
        ? instructions.flatMap((section) => section.points)
        : instructions;
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
      const instructionArray = areInstructionSections(instructions)
        ? instructions.flatMap((section) => section.points)
        : instructions;
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
      expect(fileTypePromptMetadata.csharp.contentDesc).toBe("C# source code");
    });

    it("should be marked as complex schema", () => {
      expect(fileTypePromptMetadata.csharp.hasComplexSchema).toBe(true);
    });

    it("should include C#-specific instructions", () => {
      const instructions = fileTypePromptMetadata.csharp.instructions;
      const instructionArray = areInstructionSections(instructions)
        ? instructions.flatMap((section) => section.points)
        : instructions;
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
      const instructionArray = areInstructionSections(instructions)
        ? instructions.flatMap((section) => section.points)
        : instructions;
      const instructionText = instructionArray.join(" ");
      expect(instructionText).toContain("ActiveRecord");
      expect(instructionText).toContain("module");
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
        expect(typeof config.hasComplexSchema).toBe("boolean");
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
      expect(fileTypePromptMetadata.default.contentDesc).toBe("project file content");
      expect(fileTypePromptMetadata.sql.hasComplexSchema).toBe(true);
    });
  });
});

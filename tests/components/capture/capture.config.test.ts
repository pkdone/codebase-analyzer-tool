import { fileTypeMetadataConfig } from "../../../src/components/capture/config/capture.config";

describe("fileTypeMetadataConfig", () => {
  describe("supported file types", () => {
    it("should have configurations for all expected file types", () => {
      const expectedTypes: (keyof typeof fileTypeMetadataConfig)[] = [
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

      expectedTypes.forEach((type) => {
        expect(fileTypeMetadataConfig[type]).toBeDefined();
        expect(fileTypeMetadataConfig[type]).toHaveProperty("contentDesc");
        expect(fileTypeMetadataConfig[type]).toHaveProperty("instructions");
        expect(fileTypeMetadataConfig[type]).toHaveProperty("schema");
        expect(fileTypeMetadataConfig[type]).toHaveProperty("hasComplexSchema");
      });
    });

    it("should always have a default configuration", () => {
      expect(fileTypeMetadataConfig.default).toBeDefined();
      expect(fileTypeMetadataConfig.default.contentDesc).toBe("project file content");
      expect(typeof fileTypeMetadataConfig.default.instructions).toBe("string");
      expect(fileTypeMetadataConfig.default.schema).toBeDefined();
      expect(typeof fileTypeMetadataConfig.default.hasComplexSchema).toBe("boolean");
    });
  });

  describe("java configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypeMetadataConfig.java.contentDesc).toBe("code");
    });

    it("should not be marked as complex schema", () => {
      expect(fileTypeMetadataConfig.java.hasComplexSchema).toBe(false);
    });

    it("should include expected instructions", () => {
      const instructions = fileTypeMetadataConfig.java.instructions;
      expect(instructions).toContain("namespace");
      expect(instructions).toContain("public methods");
      expect(instructions).toContain("database integration");
      expect(instructions).toContain("internal references");
      expect(instructions).toContain("external references");
    });

    it("should have a valid schema", () => {
      expect(fileTypeMetadataConfig.java.schema).toBeDefined();
      expect(typeof fileTypeMetadataConfig.java.schema.parse).toBe("function");
    });
  });

  describe("javascript configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypeMetadataConfig.javascript.contentDesc).toBe("JavaScript/TypeScript code");
    });

    it("should not be marked as complex schema", () => {
      expect(fileTypeMetadataConfig.javascript.hasComplexSchema).toBe(false);
    });

    it("should include expected instructions", () => {
      const instructions = fileTypeMetadataConfig.javascript.instructions;
      expect(instructions).toContain("purpose");
      expect(instructions).toContain("implementation");
      expect(instructions).toContain("internal references");
    });
  });

  describe("sql configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypeMetadataConfig.sql.contentDesc).toBe("database DDL/DML/SQL code");
    });

    it("should be marked as complex schema", () => {
      expect(fileTypeMetadataConfig.sql.hasComplexSchema).toBe(true);
    });

    it("should include SQL-specific instructions", () => {
      const instructions = fileTypeMetadataConfig.sql.instructions;
      expect(instructions).toContain("stored procedure");
      expect(instructions).toContain("triggers");
      expect(instructions).toContain("tables");
    });

    it("should have a valid schema", () => {
      expect(fileTypeMetadataConfig.sql.schema).toBeDefined();
      expect(typeof fileTypeMetadataConfig.sql.schema.parse).toBe("function");
    });
  });

  describe("csharp configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypeMetadataConfig.csharp.contentDesc).toBe("C# source code");
    });

    it("should not be marked as complex schema", () => {
      expect(fileTypeMetadataConfig.csharp.hasComplexSchema).toBe(false);
    });

    it("should include C#-specific instructions", () => {
      const instructions = fileTypeMetadataConfig.csharp.instructions;
      expect(instructions).toContain("Entity Framework");
      expect(instructions).toContain("Dapper");
      expect(instructions).toContain("async/sync");
    });
  });

  describe("ruby configuration", () => {
    it("should have appropriate content description", () => {
      expect(fileTypeMetadataConfig.ruby.contentDesc).toBe("Ruby code");
    });

    it("should not be marked as complex schema", () => {
      expect(fileTypeMetadataConfig.ruby.hasComplexSchema).toBe(false);
    });

    it("should include Ruby-specific instructions", () => {
      const instructions = fileTypeMetadataConfig.ruby.instructions;
      expect(instructions).toContain("ActiveRecord");
      expect(instructions).toContain("module");
    });
  });

  describe("configuration structure", () => {
    it("should have all configurations with required properties", () => {
      Object.values(fileTypeMetadataConfig).forEach((config) => {
        expect(config).toBeDefined();
        expect(typeof config.contentDesc).toBe("string");
        expect(typeof config.instructions).toBe("string");
        expect(config.schema).toBeDefined();
        expect(typeof config.hasComplexSchema).toBe("boolean");
      });
    });

    it("should have non-empty instructions for all types", () => {
      Object.values(fileTypeMetadataConfig).forEach((config) => {
        expect(config.instructions.length).toBeGreaterThan(0);
      });
    });
  });

  describe("type safety", () => {
    it("should be defined as const object with all required properties", () => {
      // Verify the config object structure is correct
      expect(fileTypeMetadataConfig).toBeDefined();
      expect(fileTypeMetadataConfig.java).toBeDefined();
      expect(fileTypeMetadataConfig.default).toBeDefined();
    });

    it("should maintain configuration integrity", () => {
      // Verify configurations maintain their expected values
      expect(fileTypeMetadataConfig.java.contentDesc).toBe("code");
      expect(fileTypeMetadataConfig.default.contentDesc).toBe("project file content");
      expect(fileTypeMetadataConfig.sql.hasComplexSchema).toBe(true);
    });
  });
});

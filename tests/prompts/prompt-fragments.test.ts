import { SOURCES_PROMPT_FRAGMENTS } from "../../src/prompts/definitions/fragments";

describe("Fragment Factory Functions", () => {
  describe("DB_MECHANISM_MAPPING fragments", () => {
    test("Java DB_MECHANISM_MAPPING should contain expected structure", () => {
      const javaMapping = SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING;

      // Should start with the common prefix
      expect(javaMapping).toContain(
        "- mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:",
      );

      // Should contain Java-specific examples
      expect(javaMapping).toContain("Uses JDBC driver / JDBC API classes => mechanism: 'JDBC'");
      expect(javaMapping).toContain("Uses Spring Data repositories");
      expect(javaMapping).toContain("Uses Hibernate API directly");

      // Should end with the common suffix
      expect(javaMapping).toContain(
        "Otherwise, if the code does not use a database => mechanism: 'NONE'",
      );

      // Should contain Java-specific note
      expect(javaMapping).toContain(
        "(note, JMS and JNDI are not related to interacting with a database)",
      );
    });

    test("JavaScript DB_MECHANISM_MAPPING should contain expected structure", () => {
      const jsMapping = SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING;

      // Should start with the common prefix
      expect(jsMapping).toContain(
        "- mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:",
      );

      // Should contain JavaScript-specific examples
      expect(jsMapping).toContain("Uses Mongoose schemas/models");
      expect(jsMapping).toContain("Uses Prisma Client");
      expect(jsMapping).toContain("Uses TypeORM");

      // Should end with the common suffix
      expect(jsMapping).toContain(
        "Otherwise, if the code does not use a database => mechanism: 'NONE'",
      );
    });

    test("C# DB_MECHANISM_MAPPING should contain expected structure", () => {
      const csharpMapping = SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING;

      // Should start with the common prefix
      expect(csharpMapping).toContain(
        "- mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:",
      );

      // Should contain C#-specific examples
      expect(csharpMapping).toContain("Uses Entity Framework / EF Core");
      expect(csharpMapping).toContain("Uses Dapper extension methods");
      expect(csharpMapping).toContain("Uses ADO.NET primitives");

      // Should end with the common suffix
      expect(csharpMapping).toContain(
        "Otherwise, if the code does not use a database => mechanism: 'NONE'",
      );
    });

    test("Python DB_MECHANISM_MAPPING should contain expected structure", () => {
      const pythonMapping = SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING;

      // Should start with the common prefix
      expect(pythonMapping).toContain(
        "- mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:",
      );

      // Should contain Python-specific examples
      expect(pythonMapping).toContain("SQLAlchemy ORM");
      expect(pythonMapping).toContain("Django ORM");

      // Should end with the common suffix
      expect(pythonMapping).toContain(
        "Otherwise, if the code does not use a database => mechanism: 'NONE'",
      );
    });

    test("Ruby DB_MECHANISM_MAPPING should contain expected structure", () => {
      const rubyMapping = SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING;

      // Should start with the common prefix
      expect(rubyMapping).toContain(
        "- mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:",
      );

      // Should contain Ruby-specific examples
      expect(rubyMapping).toContain("Uses ActiveRecord");
      expect(rubyMapping).toContain("Uses Sequel ORM");

      // Should end with the common suffix
      expect(rubyMapping).toContain(
        "Otherwise, if the code does not use a database => mechanism: 'NONE'",
      );
    });

    test("all DB_MECHANISM_MAPPING fragments should have consistent structure", () => {
      const mappings = [
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING,
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING,
      ];

      // All should start with the same prefix
      const commonPrefix =
        "- mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:";
      mappings.forEach((mapping) => {
        expect(mapping).toContain(commonPrefix);
      });

      // All should end with the same suffix (Java has an extra note, but still has the suffix)
      mappings.forEach((mapping) => {
        expect(mapping).toContain("=> mechanism: 'NONE'");
      });
    });

    test("DB_MECHANISM_MAPPING fragments should not have duplicate content", () => {
      const javaMapping = SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING;
      const jsMapping = SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING;

      // Java-specific content should not appear in JavaScript mapping
      expect(jsMapping).not.toContain("JDBC driver / JDBC API classes");
      expect(jsMapping).not.toContain("Spring Data repositories");

      // JavaScript-specific content should not appear in Java mapping
      expect(javaMapping).not.toContain("Mongoose schemas/models");
      expect(javaMapping).not.toContain("Prisma Client");
    });
  });
});

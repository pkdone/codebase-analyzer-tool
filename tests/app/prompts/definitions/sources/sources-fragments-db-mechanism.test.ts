import { SOURCES_PROMPT_FRAGMENTS } from "../../../../../src/app/prompts/definitions/sources/sources.fragments";

/**
 * Tests for the createDbMechanismInstructions function.
 *
 * This function was moved from src/app/prompts/utils/prompt-utils.ts to
 * src/app/prompts/definitions/sources/sources.fragments.ts as part of the
 * prompt refactoring to co-locate related code.
 *
 * The function is not exported (it's a module-private helper), so we test
 * its behavior through the DB_MECHANISM_MAPPING constants it generates.
 */
describe("createDbMechanismInstructions (via DB_MECHANISM_MAPPING fragments)", () => {
  /**
   * Base structure constants that should be present in all DB mechanism mappings.
   */
  const BASE_PREFIX =
    "- mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:";
  const BASE_SUFFIX = "=> mechanism: 'NONE'";

  describe("Java DB_MECHANISM_MAPPING", () => {
    const javaMapping = SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING;

    it("should include the base prefix", () => {
      expect(javaMapping).toContain(BASE_PREFIX);
    });

    it("should include the base suffix", () => {
      expect(javaMapping).toContain(BASE_SUFFIX);
    });

    it("should include Java-specific database mechanisms", () => {
      const expectedMechanisms = [
        "JDBC",
        "SPRING-DATA",
        "HIBERNATE",
        "JPA",
        "EJB",
        "SQL",
        "DRIVER",
        "ORM",
        "DDL",
        "DML",
        "STORED-PROCEDURE",
        "TRIGGER",
        "FUNCTION",
        "REDIS",
        "ELASTICSEARCH",
        "CASSANDRA-CQL",
        "OTHER",
        "NONE",
      ];

      expectedMechanisms.forEach((mechanism) => {
        expect(javaMapping).toContain(`mechanism: '${mechanism}'`);
      });
    });

    it("should include the Java-specific JMS/JNDI note", () => {
      expect(javaMapping).toContain(
        "(note, JMS and JNDI are not related to interacting with a database)",
      );
    });
  });

  describe("JavaScript DB_MECHANISM_MAPPING", () => {
    const jsMapping = SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING;

    it("should include the base prefix", () => {
      expect(jsMapping).toContain(BASE_PREFIX);
    });

    it("should include the base suffix", () => {
      expect(jsMapping).toContain(BASE_SUFFIX);
    });

    it("should include JavaScript-specific database mechanisms", () => {
      const expectedMechanisms = [
        "MONGOOSE",
        "PRISMA",
        "TYPEORM",
        "SEQUELIZE",
        "KNEX",
        "DRIZZLE",
        "REDIS",
        "ELASTICSEARCH",
        "CASSANDRA-CQL",
        "MQL",
        "SQL",
        "DRIVER",
        "DDL",
        "DML",
        "NONE",
      ];

      expectedMechanisms.forEach((mechanism) => {
        expect(jsMapping).toContain(`mechanism: '${mechanism}'`);
      });
    });

    it("should NOT include the Java JMS/JNDI note", () => {
      expect(jsMapping).not.toContain("JMS and JNDI");
    });
  });

  describe("C# DB_MECHANISM_MAPPING", () => {
    const csharpMapping = SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING;

    it("should include the base prefix", () => {
      expect(csharpMapping).toContain(BASE_PREFIX);
    });

    it("should include the base suffix", () => {
      expect(csharpMapping).toContain(BASE_SUFFIX);
    });

    it("should include C#-specific database mechanisms", () => {
      const expectedMechanisms = [
        "EF-CORE",
        "DAPPER",
        "MICRO-ORM",
        "ADO-NET",
        "SQL",
        "STORED-PROCEDURE",
        "DRIVER",
        "DDL",
        "DML",
        "FUNCTION",
        "REDIS",
        "ELASTICSEARCH",
        "NONE",
      ];

      expectedMechanisms.forEach((mechanism) => {
        expect(csharpMapping).toContain(`mechanism: '${mechanism}'`);
      });
    });
  });

  describe("Python DB_MECHANISM_MAPPING", () => {
    const pythonMapping = SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING;

    it("should include the base prefix", () => {
      expect(pythonMapping).toContain(BASE_PREFIX);
    });

    it("should include the base suffix", () => {
      expect(pythonMapping).toContain(BASE_SUFFIX);
    });

    it("should include Python-specific database mechanisms", () => {
      // Most mechanisms use the format "=> 'MECHANISM'" except NONE which uses "mechanism: 'NONE'"
      const expectedMechanismsArrowFormat = [
        "SQLALCHEMY",
        "DJANGO-ORM",
        "DRIVER",
        "SQL",
        "DDL",
        "DML",
        "STORED-PROCEDURE",
        "FUNCTION",
      ];

      expectedMechanismsArrowFormat.forEach((mechanism) => {
        expect(pythonMapping).toContain(`'${mechanism}'`);
      });

      // NONE uses the special "mechanism: 'NONE'" format in the suffix
      expect(pythonMapping).toContain("mechanism: 'NONE'");
    });
  });

  describe("Ruby DB_MECHANISM_MAPPING", () => {
    const rubyMapping = SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING;

    it("should include the base prefix", () => {
      expect(rubyMapping).toContain(BASE_PREFIX);
    });

    it("should include the base suffix", () => {
      expect(rubyMapping).toContain(BASE_SUFFIX);
    });

    it("should include Ruby-specific database mechanisms", () => {
      const expectedMechanisms = [
        "ACTIVE-RECORD",
        "SEQUEL",
        "ORM",
        "REDIS",
        "SQL",
        "STORED-PROCEDURE",
        "DRIVER",
        "DDL",
        "DML",
        "TRIGGER",
        "FUNCTION",
        "NONE",
      ];

      expectedMechanisms.forEach((mechanism) => {
        expect(rubyMapping).toContain(`mechanism: '${mechanism}'`);
      });
    });
  });

  describe("Cross-language consistency", () => {
    const allMappings = [
      { name: "Java", mapping: SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING },
      {
        name: "JavaScript",
        mapping: SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING,
      },
      { name: "C#", mapping: SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING },
      { name: "Python", mapping: SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING },
      { name: "Ruby", mapping: SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING },
    ];

    it("should have consistent base structure across all languages", () => {
      allMappings.forEach(({ mapping }) => {
        expect(mapping).toContain(BASE_PREFIX);
        expect(mapping).toContain(BASE_SUFFIX);
      });
    });

    it("should have NONE mechanism in all languages", () => {
      allMappings.forEach(({ mapping }) => {
        expect(mapping).toContain("mechanism: 'NONE'");
      });
    });

    it("should have multiple lines separated by newlines", () => {
      allMappings.forEach(({ mapping }) => {
        const lines = mapping.split("\n");
        expect(lines.length).toBeGreaterThan(3);
      });
    });
  });
});


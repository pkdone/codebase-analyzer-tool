import { z } from "zod";
import {
  fileTypePromptRegistry,
  type FileTypePromptRegistry,
} from "../../../../../src/app/prompts/sources/sources.definitions";
import { INSTRUCTION_SECTION_TITLES } from "../../../../../src/app/prompts/sources/definitions/source-config-factories";
import { commonSourceAnalysisSchema } from "../../../../../src/app/schemas/sources.schema";

describe("Source Config Consistency", () => {
  /**
   * Standard code file types that should all have the same structure.
   * These are the main programming language configurations.
   */
  const STANDARD_CODE_TYPES = [
    "java",
    "javascript",
    "csharp",
    "python",
    "ruby",
    "c",
    "cpp",
  ] as const;

  /**
   * Expected section order for standard code files.
   * This enforces consistency across all programming language configurations.
   */
  const EXPECTED_STANDARD_SECTIONS = [
    INSTRUCTION_SECTION_TITLES.BASIC_INFO,
    INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
    INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
    INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
    INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
  ];

  /**
   * Helper function to extract section title from instruction block.
   * Instructions are formatted as "__Title__\n..." so we extract the title.
   */
  function extractSectionTitle(instruction: string): string | null {
    const titlePattern = /^__(.+?)__/;
    const match = titlePattern.exec(instruction);
    return match ? match[1] : null;
  }

  describe("Standard Code File Types", () => {
    it.each(STANDARD_CODE_TYPES)("%s should have exactly 5 instruction blocks", (fileType) => {
      const config = fileTypePromptRegistry[fileType];
      expect(config.instructions).toHaveLength(5);
    });

    it.each(STANDARD_CODE_TYPES)(
      "%s should have instructions in the standard order",
      (fileType) => {
        const config = fileTypePromptRegistry[fileType];
        const sectionTitles = config.instructions.map(extractSectionTitle);

        expect(sectionTitles).toEqual(EXPECTED_STANDARD_SECTIONS);
      },
    );

    it.each(STANDARD_CODE_TYPES)("%s should use commonSourceAnalysisSchema", (fileType) => {
      const config = fileTypePromptRegistry[fileType];

      // Get the shape of both schemas
      const configSchemaShape = Object.keys(
        (config.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      );
      const commonSchemaShape = Object.keys(
        (commonSourceAnalysisSchema as z.ZodObject<z.ZodRawShape>).shape,
      );

      // They should have the same fields
      expect(configSchemaShape.sort()).toEqual(commonSchemaShape.sort());
    });

    it.each(STANDARD_CODE_TYPES)("%s should have non-empty contentDesc", (fileType) => {
      const config = fileTypePromptRegistry[fileType];
      expect(config.contentDesc).toBeTruthy();
      expect(typeof config.contentDesc).toBe("string");
      expect(config.contentDesc.length).toBeGreaterThan(0);
    });
  });

  describe("All Source Configs Validity", () => {
    const allConfigKeys = Object.keys(fileTypePromptRegistry) as (keyof FileTypePromptRegistry)[];

    it.each(allConfigKeys)("%s should have non-empty instructions array", (key) => {
      const config = fileTypePromptRegistry[key];
      expect(config.instructions.length).toBeGreaterThan(0);
      expect(config.instructions.every((i) => typeof i === "string")).toBe(true);
    });

    it.each(allConfigKeys)("%s should have non-empty contentDesc", (key) => {
      const config = fileTypePromptRegistry[key];
      expect(config.contentDesc).toBeTruthy();
      expect(typeof config.contentDesc).toBe("string");
    });

    it.each(allConfigKeys)("%s should have valid responseSchema", (key) => {
      const config = fileTypePromptRegistry[key];
      expect(config.responseSchema).toBeDefined();
      expect(typeof config.responseSchema.parse).toBe("function");
    });

    it.each(allConfigKeys)("%s should have all instructions with section titles", (key) => {
      const config = fileTypePromptRegistry[key];
      for (const instruction of config.instructions) {
        const title = extractSectionTitle(instruction);
        expect(title).not.toBeNull();
        expect(title!.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Non-Standard File Types", () => {
    /**
     * Non-standard file types that have different structures
     */
    const NON_STANDARD_TYPES = [
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
      "makefile",
      "default",
    ] as const;

    it.each(NON_STANDARD_TYPES)("%s should have at least 1 instruction block", (fileType) => {
      const config = fileTypePromptRegistry[fileType];
      expect(config.instructions.length).toBeGreaterThanOrEqual(1);
    });

    it.each(NON_STANDARD_TYPES)(
      "%s should have a specific schema (not commonSourceAnalysisSchema)",
      (fileType) => {
        const config = fileTypePromptRegistry[fileType];
        const configSchemaShape = Object.keys(
          (config.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
        );
        const commonSchemaShape = Object.keys(
          (commonSourceAnalysisSchema as z.ZodObject<z.ZodRawShape>).shape,
        );

        // Non-standard types should have different schemas
        // (either fewer fields or different fields)
        const schemasAreDifferent =
          configSchemaShape.length !== commonSchemaShape.length ||
          !configSchemaShape.every((field) => commonSchemaShape.includes(field));

        expect(schemasAreDifferent).toBe(true);
      },
    );
  });

  describe("SQL File Type Specifics", () => {
    it("should have Database Objects section for SQL", () => {
      const sqlConfig = fileTypePromptRegistry.sql;
      const sectionTitles = sqlConfig.instructions.map(extractSectionTitle);

      expect(sectionTitles).toContain(INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS);
    });

    it("should have schema fields for tables, storedProcedures, triggers", () => {
      const sqlConfig = fileTypePromptRegistry.sql;
      const schemaShape = Object.keys(
        (sqlConfig.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      );

      expect(schemaShape).toContain("tables");
      expect(schemaShape).toContain("storedProcedures");
      expect(schemaShape).toContain("triggers");
    });
  });

  describe("Script File Types", () => {
    const SCRIPT_TYPES = ["shell-script", "batch-script", "jcl"] as const;

    it.each(SCRIPT_TYPES)("%s should have Scheduled Jobs section", (fileType) => {
      const config = fileTypePromptRegistry[fileType];
      const sectionTitles = config.instructions.map(extractSectionTitle);

      expect(sectionTitles).toContain(INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS);
    });

    it.each(SCRIPT_TYPES)("%s should have scheduledJobs in schema", (fileType) => {
      const config = fileTypePromptRegistry[fileType];
      const schemaShape = Object.keys((config.responseSchema as z.ZodObject<z.ZodRawShape>).shape);

      expect(schemaShape).toContain("scheduledJobs");
    });
  });

  describe("Build Tool File Types (Dependency Config Factory)", () => {
    /**
     * All dependency file types that use the createDependencyConfig factory.
     * These should all have identical structure: purpose, implementation, dependencies schema
     * and exactly 2 instruction blocks (Basic Info + References and Dependencies).
     */
    const DEPENDENCY_FILE_TYPES = [
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
      "makefile",
    ] as const;

    it.each(DEPENDENCY_FILE_TYPES)("%s should have dependencies in schema", (fileType) => {
      const config = fileTypePromptRegistry[fileType];
      const schemaShape = Object.keys((config.responseSchema as z.ZodObject<z.ZodRawShape>).shape);

      expect(schemaShape).toContain("dependencies");
    });

    it.each(DEPENDENCY_FILE_TYPES)(
      "%s should have References and Dependencies section",
      (fileType) => {
        const config = fileTypePromptRegistry[fileType];
        const sectionTitles = config.instructions.map(extractSectionTitle);

        expect(sectionTitles).toContain(INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS);
      },
    );

    it.each(DEPENDENCY_FILE_TYPES)(
      "%s should have exactly 2 instruction blocks (from factory)",
      (fileType) => {
        const config = fileTypePromptRegistry[fileType];
        expect(config.instructions).toHaveLength(2);
      },
    );

    it.each(DEPENDENCY_FILE_TYPES)(
      "%s should have Basic Info as first section (from factory)",
      (fileType) => {
        const config = fileTypePromptRegistry[fileType];
        const firstTitle = extractSectionTitle(config.instructions[0]);
        expect(firstTitle).toBe(INSTRUCTION_SECTION_TITLES.BASIC_INFO);
      },
    );

    it.each(DEPENDENCY_FILE_TYPES)(
      "%s should have exactly 3 schema fields: purpose, implementation, dependencies",
      (fileType) => {
        const config = fileTypePromptRegistry[fileType];
        const schemaShape = Object.keys(
          (config.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
        ).sort();

        expect(schemaShape).toEqual(["dependencies", "implementation", "purpose"]);
      },
    );

    it("all dependency configs should have identical schema structure", () => {
      const schemas = DEPENDENCY_FILE_TYPES.map((fileType) => {
        const config = fileTypePromptRegistry[fileType];
        return Object.keys((config.responseSchema as z.ZodObject<z.ZodRawShape>).shape).sort();
      });

      // All schemas should match the first one
      const firstSchema = schemas[0];
      for (let i = 1; i < schemas.length; i++) {
        expect(schemas[i]).toEqual(firstSchema);
      }
    });
  });

  describe("JSP File Type", () => {
    it("should have User Input Fields section", () => {
      const jspConfig = fileTypePromptRegistry.jsp;
      const sectionTitles = jspConfig.instructions.map(extractSectionTitle);

      expect(sectionTitles).toContain(INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS);
    });

    it("should have jspMetrics and dataInputFields in schema", () => {
      const jspConfig = fileTypePromptRegistry.jsp;
      const schemaShape = Object.keys(
        (jspConfig.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      );

      expect(schemaShape).toContain("jspMetrics");
      expect(schemaShape).toContain("dataInputFields");
    });
  });

  describe("XML File Type", () => {
    it("should have UI Framework Detection section", () => {
      const xmlConfig = fileTypePromptRegistry.xml;
      const sectionTitles = xmlConfig.instructions.map(extractSectionTitle);

      expect(sectionTitles).toContain(INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION);
    });

    it("should have uiFramework in schema", () => {
      const xmlConfig = fileTypePromptRegistry.xml;
      const schemaShape = Object.keys(
        (xmlConfig.responseSchema as z.ZodObject<z.ZodRawShape>).shape,
      );

      expect(schemaShape).toContain("uiFramework");
    });
  });

  describe("Config Map Completeness", () => {
    it("should have exactly 26 file type configurations", () => {
      const configKeys = Object.keys(fileTypePromptRegistry);
      expect(configKeys).toHaveLength(26);
    });

    it("should include default configuration", () => {
      expect(fileTypePromptRegistry).toHaveProperty("default");
    });

    it("should have all standard code types", () => {
      for (const type of STANDARD_CODE_TYPES) {
        expect(fileTypePromptRegistry).toHaveProperty(type);
      }
    });
  });

  describe("Instruction Block Format", () => {
    const allConfigKeys = Object.keys(fileTypePromptRegistry) as (keyof FileTypePromptRegistry)[];

    it.each(allConfigKeys)("%s instructions should follow __Title__ format", (key) => {
      const config = fileTypePromptRegistry[key];
      for (const instruction of config.instructions) {
        expect(instruction).toMatch(/^__[^_]+__/);
      }
    });

    it.each(allConfigKeys)("%s instructions should have content after title", (key) => {
      const config = fileTypePromptRegistry[key];
      for (const instruction of config.instructions) {
        // After "__Title__" there should be newline and content, or just the title
        const afterTitle = instruction.replace(/^__[^_]+__/, "");
        // Either empty (title only) or starts with newline
        expect(afterTitle === "" || afterTitle.startsWith("\n")).toBe(true);
      }
    });
  });
});

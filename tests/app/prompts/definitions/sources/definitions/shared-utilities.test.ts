import {
  createDependencyConfig,
  createSimpleConfig,
  createBasicInfoBlock,
  type SourceSummaryField,
} from "../../../../../../src/app/prompts/definitions/sources/definitions/shared-utilities";
import {
  INSTRUCTION_SECTION_TITLES,
  buildInstructionBlock,
} from "../../../../../../src/app/prompts/definitions/instruction-utils";
import { SOURCES_PROMPT_FRAGMENTS } from "../../../../../../src/app/prompts/definitions/sources/sources.fragments";
import { sourceSummarySchema } from "../../../../../../src/app/schemas/sources.schema";

describe("shared-utilities", () => {
  describe("createBasicInfoBlock", () => {
    it("should create the standard Basic Info block", () => {
      const result = createBasicInfoBlock();

      expect(result).toContain("__Basic Information__");
      expect(result).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE);
      expect(result).toContain(SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION);
    });

    it("should match the manual construction pattern", () => {
      const manual = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      );

      expect(createBasicInfoBlock()).toBe(manual);
    });

    it("should produce consistent output on multiple calls", () => {
      const result1 = createBasicInfoBlock();
      const result2 = createBasicInfoBlock();
      expect(result1).toBe(result2);
    });
  });

  describe("createDependencyConfig", () => {
    it("should use createBasicInfoBlock for Basic Info section", () => {
      const config = createDependencyConfig("test content", "dependency fragment");

      expect(config.instructions[0]).toBe(createBasicInfoBlock());
    });

    it("should produce correct structure with Basic Info and References sections", () => {
      const config = createDependencyConfig("test", "fragment");
      expect(config.instructions).toHaveLength(2);
      expect(config.instructions[0]).toContain("__Basic Information__");
      expect(config.instructions[1]).toContain("__References and Dependencies__");
      expect(config.instructions[1]).toContain("fragment");
    });

    it("should have correct schema fields", () => {
      const config = createDependencyConfig("test", "fragment");
      const schemaShape = Object.keys((config.responseSchema as any).shape).sort();
      expect(schemaShape).toEqual(["dependencies", "implementation", "purpose"]);
    });

    it("should produce identical output to previous implementation", () => {
      const config = createDependencyConfig("test content", "dependency fragment");
      const expectedBasicInfo = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      );

      expect(config.instructions[0]).toBe(expectedBasicInfo);
    });
  });

  describe("createSimpleConfig", () => {
    it("should use createBasicInfoBlock when first block is BASIC_INFO with standard fragments", () => {
      const config = createSimpleConfig(
        "test content",
        ["purpose", "implementation"],
        [
          {
            title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
            fragments: [
              SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
              SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
            ],
          },
        ],
      );

      expect(config.instructions[0]).toBe(createBasicInfoBlock());
    });

    it("should not use helper when fragments differ", () => {
      const config = createSimpleConfig(
        "test content",
        ["purpose", "implementation"],
        [
          {
            title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
            fragments: [
              SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
              "Different implementation fragment",
            ],
          },
        ],
      );

      expect(config.instructions[0]).not.toBe(createBasicInfoBlock());
      expect(config.instructions[0]).toContain("__Basic Information__");
    });

    it("should handle multiple instruction blocks", () => {
      const config = createSimpleConfig(
        "test content",
        ["purpose", "implementation", "databaseIntegration"],
        [
          {
            title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
            fragments: [
              SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
              SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
            ],
          },
          {
            title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
            fragments: ["Database fragment"],
          },
        ],
      );

      expect(config.instructions).toHaveLength(2);
      expect(config.instructions[0]).toBe(createBasicInfoBlock());
      expect(config.instructions[1]).toContain("__Database Integration Analysis__");
    });

    it("should accept InstructionSectionTitle type for block titles", () => {
      const config = createSimpleConfig(
        "test",
        ["purpose"],
        [
          {
            title: INSTRUCTION_SECTION_TITLES.REFERENCES,
            fragments: ["Fragment"],
          },
        ],
      );

      expect(config.instructions[0]).toContain("__References__");
    });

    describe("type safety with SourceSummaryField", () => {
      it("should accept valid sourceSummarySchema field names", () => {
        // These are valid SourceSummaryField values
        const validFields: SourceSummaryField[] = [
          "purpose",
          "implementation",
          "name",
          "namespace",
          "kind",
          "internalReferences",
          "externalReferences",
          "dependencies",
          "databaseIntegration",
        ];

        const config = createSimpleConfig("test", validFields, [
          {
            title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
            fragments: [SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE],
          },
        ]);

        // Verify schema was created correctly with all fields
        const schemaShape = Object.keys((config.responseSchema as any).shape);
        validFields.forEach((field) => {
          expect(schemaShape).toContain(field);
        });
      });

      it("should create pick mask that produces valid Zod schema", () => {
        const fields: SourceSummaryField[] = ["purpose", "implementation", "dependencies"];

        const config = createSimpleConfig("test", fields, [
          {
            title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
            fragments: [SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE],
          },
        ]);

        // Verify the schema is a valid Zod schema that can parse data
        const testData = {
          purpose: "Test purpose",
          implementation: "Test implementation",
          dependencies: [],
        };

        const parseResult = config.responseSchema.safeParse(testData);
        expect(parseResult.success).toBe(true);
      });

      it("should only include specified fields in the schema", () => {
        const fields: SourceSummaryField[] = ["purpose", "implementation"];

        const config = createSimpleConfig("test", fields, [
          {
            title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
            fragments: [SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE],
          },
        ]);

        const schemaShape = Object.keys((config.responseSchema as any).shape);
        expect(schemaShape).toEqual(fields);
      });

      it("should align with sourceSummarySchema available keys", () => {
        // Get all valid keys from sourceSummarySchema
        const sourceSummaryKeys = Object.keys(sourceSummarySchema.shape);

        // Use a subset as SourceSummaryField type requires
        const testFields: SourceSummaryField[] = ["purpose", "implementation", "name"];

        // Verify all test fields exist in the source schema
        testFields.forEach((field) => {
          expect(sourceSummaryKeys).toContain(field);
        });

        // Create config and verify it works
        const config = createSimpleConfig("test", testFields, [
          {
            title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
            fragments: [SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE],
          },
        ]);

        expect(config.responseSchema).toBeDefined();
      });
    });
  });
});

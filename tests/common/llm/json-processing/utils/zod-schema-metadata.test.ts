/**
 * Tests for the Zod schema metadata extraction utility.
 */

import { z } from "zod";
import {
  extractSchemaMetadata,
  schemaMetadataToSanitizerConfig,
} from "../../../../../src/common/llm/json-processing/utils/zod-schema-metadata";

describe("zod-schema-metadata", () => {
  describe("extractSchemaMetadata", () => {
    describe("basic object schemas", () => {
      it("should extract all property names from a simple object schema", () => {
        const schema = z.object({
          name: z.string(),
          purpose: z.string(),
          description: z.string(),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.allProperties).toContain("name");
        expect(metadata.allProperties).toContain("purpose");
        expect(metadata.allProperties).toContain("description");
        expect(metadata.allProperties).toHaveLength(3);
      });

      it("should identify numeric properties", () => {
        const schema = z.object({
          name: z.string(),
          count: z.number(),
          totalFunctions: z.number(),
          averageComplexity: z.number(),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.numericProperties).toContain("count");
        expect(metadata.numericProperties).toContain("totalFunctions");
        expect(metadata.numericProperties).toContain("averageComplexity");
        expect(metadata.numericProperties).toHaveLength(3);
        expect(metadata.numericProperties).not.toContain("name");
      });

      it("should identify array properties", () => {
        const schema = z.object({
          name: z.string(),
          items: z.array(z.string()),
          references: z.array(z.string()),
          publicFunctions: z.array(z.object({ name: z.string() })),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.arrayProperties).toContain("items");
        expect(metadata.arrayProperties).toContain("references");
        expect(metadata.arrayProperties).toContain("publicFunctions");
        expect(metadata.arrayProperties).toHaveLength(3);
        expect(metadata.arrayProperties).not.toContain("name");
      });
    });

    describe("wrapped types", () => {
      it("should unwrap optional types to find underlying type", () => {
        const schema = z.object({
          name: z.string(),
          count: z.number().optional(),
          items: z.array(z.string()).optional(),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.numericProperties).toContain("count");
        expect(metadata.arrayProperties).toContain("items");
      });

      it("should unwrap nullable types to find underlying type", () => {
        const schema = z.object({
          name: z.string(),
          count: z.number().nullable(),
          items: z.array(z.string()).nullable(),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.numericProperties).toContain("count");
        expect(metadata.arrayProperties).toContain("items");
      });

      it("should unwrap default types to find underlying type", () => {
        const schema = z.object({
          name: z.string().default(""),
          count: z.number().default(0),
          items: z.array(z.string()).default([]),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.numericProperties).toContain("count");
        expect(metadata.arrayProperties).toContain("items");
      });

      it("should unwrap combined wrappers (optional + nullable + default)", () => {
        const schema = z.object({
          name: z.string(),
          count: z.number().optional().nullable(),
          items: z.array(z.string()).default([]).optional(),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.numericProperties).toContain("count");
        expect(metadata.arrayProperties).toContain("items");
      });
    });

    describe("nested object schemas", () => {
      it("should extract properties from nested objects (default depth)", () => {
        const schema = z.object({
          name: z.string(),
          codeQualityMetrics: z.object({
            totalFunctions: z.number(),
            averageComplexity: z.number(),
            fileSmells: z.array(z.string()),
          }),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.allProperties).toContain("name");
        expect(metadata.allProperties).toContain("codeQualityMetrics");
        expect(metadata.allProperties).toContain("totalFunctions");
        expect(metadata.allProperties).toContain("averageComplexity");
        expect(metadata.allProperties).toContain("fileSmells");
        expect(metadata.numericProperties).toContain("totalFunctions");
        expect(metadata.numericProperties).toContain("averageComplexity");
        expect(metadata.arrayProperties).toContain("fileSmells");
      });

      it("should respect maxDepth option", () => {
        const schema = z.object({
          level1: z.object({
            level2: z.object({
              level3: z.object({
                level4: z.object({
                  level5: z.object({
                    deepProperty: z.number(),
                  }),
                }),
              }),
            }),
          }),
        });

        // Default depth = 4, should get level1 through level4
        const metadataDefault = extractSchemaMetadata(schema);
        expect(metadataDefault.allProperties).toContain("level1");
        expect(metadataDefault.allProperties).toContain("level2");
        expect(metadataDefault.allProperties).toContain("level3");
        expect(metadataDefault.allProperties).toContain("level4");
        expect(metadataDefault.allProperties).not.toContain("level5");
        expect(metadataDefault.allProperties).not.toContain("deepProperty");

        // Depth = 2, should only get level1 and level2
        const metadataShallow = extractSchemaMetadata(schema, { maxDepth: 2 });
        expect(metadataShallow.allProperties).toContain("level1");
        expect(metadataShallow.allProperties).toContain("level2");
        expect(metadataShallow.allProperties).not.toContain("level3");

        // Depth = 6, should get all properties
        const metadataDeep = extractSchemaMetadata(schema, { maxDepth: 6 });
        expect(metadataDeep.allProperties).toContain("level5");
        expect(metadataDeep.allProperties).toContain("deepProperty");
        expect(metadataDeep.numericProperties).toContain("deepProperty");
      });
    });

    describe("array item schemas", () => {
      it("should extract properties from z.array(z.object(...))", () => {
        const schema = z.object({
          items: z.array(
            z.object({
              itemName: z.string(),
              itemCount: z.number(),
              subItems: z.array(z.string()),
            }),
          ),
        });

        const metadata = extractSchemaMetadata(schema);

        // Should include the array property itself
        expect(metadata.arrayProperties).toContain("items");

        // Should also include properties from the array item schema
        expect(metadata.allProperties).toContain("itemName");
        expect(metadata.allProperties).toContain("itemCount");
        expect(metadata.allProperties).toContain("subItems");
        expect(metadata.numericProperties).toContain("itemCount");
        expect(metadata.arrayProperties).toContain("subItems");
      });

      it("should extract properties from deeply nested array items", () => {
        const schema = z.object({
          boundedContexts: z.array(
            z.object({
              contextName: z.string(),
              aggregates: z.array(
                z.object({
                  aggregateName: z.string(),
                  entities: z.array(
                    z.object({
                      entityName: z.string(),
                      entityCount: z.number(),
                    }),
                  ),
                }),
              ),
            }),
          ),
        });

        const metadata = extractSchemaMetadata(schema);

        // All nested properties should be extracted
        expect(metadata.allProperties).toContain("boundedContexts");
        expect(metadata.allProperties).toContain("contextName");
        expect(metadata.allProperties).toContain("aggregates");
        expect(metadata.allProperties).toContain("aggregateName");
        expect(metadata.allProperties).toContain("entities");
        expect(metadata.allProperties).toContain("entityName");
        expect(metadata.allProperties).toContain("entityCount");

        // Numeric property from deepest level
        expect(metadata.numericProperties).toContain("entityCount");
      });
    });

    describe("union schemas", () => {
      it("should extract properties from z.union members", () => {
        const schema = z.object({
          result: z.union([
            z.object({
              success: z.boolean(),
              data: z.string(),
            }),
            z.object({
              success: z.boolean(),
              error: z.string(),
              errorCode: z.number(),
            }),
          ]),
        });

        const metadata = extractSchemaMetadata(schema);

        // Should include properties from both union members
        expect(metadata.allProperties).toContain("success");
        expect(metadata.allProperties).toContain("data");
        expect(metadata.allProperties).toContain("error");
        expect(metadata.allProperties).toContain("errorCode");
        expect(metadata.numericProperties).toContain("errorCode");
      });

      it("should extract properties from optional union types", () => {
        const schema = z.object({
          optionalResult: z
            .union([
              z.object({ typeA: z.string(), countA: z.number() }),
              z.object({ typeB: z.string(), countB: z.number() }),
            ])
            .optional(),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.allProperties).toContain("typeA");
        expect(metadata.allProperties).toContain("typeB");
        expect(metadata.numericProperties).toContain("countA");
        expect(metadata.numericProperties).toContain("countB");
      });
    });

    describe("discriminated union schemas", () => {
      it("should extract properties from z.discriminatedUnion members", () => {
        const schema = z.object({
          event: z.discriminatedUnion("type", [
            z.object({
              type: z.literal("click"),
              x: z.number(),
              y: z.number(),
            }),
            z.object({
              type: z.literal("scroll"),
              scrollTop: z.number(),
              scrollLeft: z.number(),
            }),
            z.object({
              type: z.literal("keypress"),
              key: z.string(),
              keyCode: z.number(),
            }),
          ]),
        });

        const metadata = extractSchemaMetadata(schema);

        // Should include properties from all discriminated union members
        expect(metadata.allProperties).toContain("type");
        expect(metadata.allProperties).toContain("x");
        expect(metadata.allProperties).toContain("y");
        expect(metadata.allProperties).toContain("scrollTop");
        expect(metadata.allProperties).toContain("scrollLeft");
        expect(metadata.allProperties).toContain("key");
        expect(metadata.allProperties).toContain("keyCode");

        // Numeric properties from all members
        expect(metadata.numericProperties).toContain("x");
        expect(metadata.numericProperties).toContain("y");
        expect(metadata.numericProperties).toContain("scrollTop");
        expect(metadata.numericProperties).toContain("keyCode");
      });
    });

    describe("intersection schemas", () => {
      it("should extract properties from z.intersection", () => {
        const baseSchema = z.object({
          id: z.string(),
          createdAt: z.string(),
        });

        const extendedSchema = z.object({
          name: z.string(),
          count: z.number(),
          tags: z.array(z.string()),
        });

        const schema = z.object({
          item: z.intersection(baseSchema, extendedSchema),
        });

        const metadata = extractSchemaMetadata(schema);

        // Should include properties from both sides of the intersection
        expect(metadata.allProperties).toContain("id");
        expect(metadata.allProperties).toContain("createdAt");
        expect(metadata.allProperties).toContain("name");
        expect(metadata.allProperties).toContain("count");
        expect(metadata.allProperties).toContain("tags");
        expect(metadata.numericProperties).toContain("count");
        expect(metadata.arrayProperties).toContain("tags");
      });

      it("should handle z.and() syntax (which creates intersection)", () => {
        const schema = z.object({
          combined: z
            .object({ firstName: z.string() })
            .and(z.object({ lastName: z.string(), age: z.number() })),
        });

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.allProperties).toContain("firstName");
        expect(metadata.allProperties).toContain("lastName");
        expect(metadata.allProperties).toContain("age");
        expect(metadata.numericProperties).toContain("age");
      });
    });

    describe("edge cases", () => {
      it("should return empty metadata for null/undefined input", () => {
        const metadata1 = extractSchemaMetadata(null as unknown as z.ZodType);
        const metadata2 = extractSchemaMetadata(undefined as unknown as z.ZodType);

        expect(metadata1.allProperties).toEqual([]);
        expect(metadata1.numericProperties).toEqual([]);
        expect(metadata1.arrayProperties).toEqual([]);

        expect(metadata2.allProperties).toEqual([]);
        expect(metadata2.numericProperties).toEqual([]);
        expect(metadata2.arrayProperties).toEqual([]);
      });

      it("should return empty metadata for non-object schemas", () => {
        const stringSchema = z.string();
        const numberSchema = z.number();
        const arraySchema = z.array(z.string());

        expect(extractSchemaMetadata(stringSchema).allProperties).toEqual([]);
        expect(extractSchemaMetadata(numberSchema).allProperties).toEqual([]);
        expect(extractSchemaMetadata(arraySchema).allProperties).toEqual([]);
      });

      it("should handle empty object schema", () => {
        const schema = z.object({});

        const metadata = extractSchemaMetadata(schema);

        expect(metadata.allProperties).toEqual([]);
        expect(metadata.numericProperties).toEqual([]);
        expect(metadata.arrayProperties).toEqual([]);
      });

      it("should deduplicate property names from nested collisions", () => {
        const schema = z.object({
          name: z.string(),
          nested1: z.object({
            name: z.string(), // Same name as parent
          }),
          nested2: z.object({
            name: z.string(), // Same name as parent
          }),
        });

        const metadata = extractSchemaMetadata(schema);

        // Should only have one "name" entry due to deduplication
        const nameCount = metadata.allProperties.filter((p) => p === "name").length;
        expect(nameCount).toBe(1);
      });

      it("should support lowercasePropertyNames option", () => {
        const schema = z.object({
          Name: z.string(),
          TotalFunctions: z.number(),
          PublicFunctions: z.array(z.string()),
        });

        const metadata = extractSchemaMetadata(schema, { lowercasePropertyNames: true });

        expect(metadata.allProperties).toContain("name");
        expect(metadata.allProperties).toContain("totalfunctions");
        expect(metadata.allProperties).toContain("publicfunctions");
        expect(metadata.numericProperties).toContain("totalfunctions");
        expect(metadata.arrayProperties).toContain("publicfunctions");
      });
    });

    describe("real-world schema patterns", () => {
      it("should handle sourceSummarySchema-like structure", () => {
        // Simplified version of the actual schema structure
        const schema = z.object({
          purpose: z.string(),
          implementation: z.string(),
          name: z.string().optional(),
          namespace: z.string().optional(),
          internalReferences: z.array(z.string()).optional(),
          externalReferences: z.array(z.string()).optional(),
          publicFunctions: z
            .array(
              z.object({
                name: z.string(),
                purpose: z.string(),
                parameters: z.array(z.object({ name: z.string(), type: z.string() })).optional(),
                returnType: z.string(),
                cyclomaticComplexity: z.number().optional(),
                linesOfCode: z.number().optional(),
              }),
            )
            .optional(),
          codeQualityMetrics: z
            .object({
              totalFunctions: z.number(),
              averageComplexity: z.number().optional(),
              maxComplexity: z.number().optional(),
            })
            .optional(),
        });

        const metadata = extractSchemaMetadata(schema);

        // Top-level properties
        expect(metadata.allProperties).toContain("purpose");
        expect(metadata.allProperties).toContain("implementation");
        expect(metadata.allProperties).toContain("name");
        expect(metadata.allProperties).toContain("internalReferences");
        expect(metadata.allProperties).toContain("publicFunctions");
        expect(metadata.allProperties).toContain("codeQualityMetrics");

        // Nested properties from codeQualityMetrics
        expect(metadata.allProperties).toContain("totalFunctions");
        expect(metadata.allProperties).toContain("averageComplexity");
        expect(metadata.allProperties).toContain("maxComplexity");

        // Properties from array item schema (publicFunctions items)
        expect(metadata.allProperties).toContain("returnType");
        expect(metadata.allProperties).toContain("parameters");
        expect(metadata.numericProperties).toContain("cyclomaticComplexity");
        expect(metadata.numericProperties).toContain("linesOfCode");

        // Properties from nested array item schema (parameters items)
        expect(metadata.allProperties).toContain("type");

        // Array properties
        expect(metadata.arrayProperties).toContain("internalReferences");
        expect(metadata.arrayProperties).toContain("externalReferences");
        expect(metadata.arrayProperties).toContain("publicFunctions");
        expect(metadata.arrayProperties).toContain("parameters");

        // Numeric properties
        expect(metadata.numericProperties).toContain("totalFunctions");
        expect(metadata.numericProperties).toContain("averageComplexity");
        expect(metadata.numericProperties).toContain("maxComplexity");
      });
    });
  });

  describe("schemaMetadataToSanitizerConfig", () => {
    it("should convert metadata to sanitizer config format", () => {
      const metadata = {
        allProperties: ["name", "purpose", "count"],
        numericProperties: ["Count"],
        arrayProperties: ["items"],
      };

      const config = schemaMetadataToSanitizerConfig(metadata);

      expect(config.knownProperties).toEqual(["name", "purpose", "count"]);
      expect(config.numericProperties).toEqual(["count"]); // Lowercased
      expect(config.arrayPropertyNames).toEqual(["items"]);
    });

    it("should merge with existing config", () => {
      const metadata = {
        allProperties: ["name", "purpose"],
        numericProperties: ["count"],
        arrayProperties: ["items"],
      };

      const existingConfig = {
        knownProperties: ["description", "name"] as readonly string[],
        numericProperties: ["linesOfCode"] as readonly string[],
        arrayPropertyNames: ["references"] as readonly string[],
        propertyNameMappings: { se: "purpose" },
      };

      const config = schemaMetadataToSanitizerConfig(metadata, existingConfig);

      // Should combine property lists (unique)
      expect(config.knownProperties).toContain("name");
      expect(config.knownProperties).toContain("purpose");
      expect(config.knownProperties).toContain("description");

      expect(config.numericProperties).toContain("count");
      expect(config.numericProperties).toContain("linesOfCode");

      expect(config.arrayPropertyNames).toContain("items");
      expect(config.arrayPropertyNames).toContain("references");

      // Should keep legacy mappings
      expect(config.propertyNameMappings).toEqual({ se: "purpose" });
    });

    it("should handle empty metadata", () => {
      const metadata = {
        allProperties: [] as readonly string[],
        numericProperties: [] as readonly string[],
        arrayProperties: [] as readonly string[],
      };

      const config = schemaMetadataToSanitizerConfig(metadata);

      expect(config.knownProperties).toEqual([]);
      expect(config.numericProperties).toEqual([]);
      expect(config.arrayPropertyNames).toEqual([]);
    });

    it("should preserve all legacy config fields when merging", () => {
      const metadata = {
        allProperties: ["name"] as readonly string[],
        numericProperties: [] as readonly string[],
        arrayProperties: [] as readonly string[],
      };

      const existingConfig = {
        knownProperties: [] as readonly string[],
        propertyNameMappings: { se: "purpose" },
        propertyTypoCorrections: { namee: "name" },
        packageNamePrefixReplacements: { "orgapache.": "org.apache." },
        packageNameTypoPatterns: [
          { pattern: /test/g, replacement: "replaced", description: "test pattern" },
        ],
      };

      const config = schemaMetadataToSanitizerConfig(metadata, existingConfig);

      expect(config.propertyNameMappings).toEqual({ se: "purpose" });
      expect(config.propertyTypoCorrections).toEqual({ namee: "name" });
      expect(config.packageNamePrefixReplacements).toEqual({ "orgapache.": "org.apache." });
      expect(config.packageNameTypoPatterns).toHaveLength(1);
    });
  });
});

import { JsonProcessor } from "../../../../src/llm/json-processing/core/json-processor";
import {
  LLMCompletionOptions,
  LLMOutputFormat,
  LLMPurpose,
} from "../../../../src/llm/types/llm.types";
import { z } from "zod";

// Define schema locally for testing (matches the structure of BomDependency)
const bomDependencySchema = z
  .object({
    name: z.string(),
    groupId: z.string().nullable().optional(),
    versions: z.array(z.string()),
    hasConflict: z.boolean(),
    scopes: z.array(z.string()).optional(),
    locations: z.array(z.string()),
  })
  .passthrough();

describe("JsonProcessor - Null Handling Integration", () => {
  let processor: JsonProcessor;

  beforeEach(() => {
    processor = new JsonProcessor(false); // Disable logging for tests
  });

  describe("Bill of Materials null groupId handling", () => {
    it("should successfully validate BOM with null groupId values from LLM response", () => {
      // This is the exact scenario from the error log where the LLM correctly
      // returned null for npm packages that don't have Maven groupIds
      const llmResponse = JSON.stringify([
        {
          name: "jhipster-framework",
          groupId: "io.github.jhipster",
          versions: ["3.8.0"],
          hasConflict: false,
          scopes: ["implementation"],
          locations: ["build.gradle"],
        },
        {
          name: "generator-jhipster",
          groupId: null, // npm package without Maven groupId
          versions: ["6.9.1"],
          hasConflict: false,
          scopes: ["devDependencies"],
          locations: ["package.json"],
        },
        {
          name: "prettier",
          groupId: null, // npm package without Maven groupId
          versions: ["2.0.5"],
          hasConflict: false,
          scopes: ["devDependencies"],
          locations: ["package.json"],
        },
      ]);

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: z.array(bomDependencySchema),
      };

      const result = processor.parseAndValidate(
        llmResponse,
        { resource: "billOfMaterials", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      // Should succeed after null-to-undefined conversion
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as unknown as Record<string, unknown>[];
        expect(data).toHaveLength(3);
        expect(data[0]).toMatchObject({
          name: "jhipster-framework",
          groupId: "io.github.jhipster",
        });
        // groupId should be omitted (converted from null)
        expect("groupId" in data[1]).toBe(false);
        expect("groupId" in data[2]).toBe(false);
      }
    });

    it("should handle the complete all-categories response with null values", () => {
      // Simulating a complete response similar to the error log
      const llmResponse = JSON.stringify({
        appDescription: "A JHipster-based microservice application",
        technologies: [],
        billOfMaterials: [
          {
            name: "spring-boot-starter-web",
            groupId: "org.springframework.boot",
            versions: ["2.2.7.RELEASE"],
            hasConflict: false,
            scopes: ["implementation"],
            locations: ["build.gradle"],
          },
          {
            name: "generator-jhipster",
            groupId: null,
            versions: ["6.9.1"],
            hasConflict: false,
            scopes: ["devDependencies"],
            locations: ["package.json"],
          },
        ],
        codeQualitySummary: {
          topComplexMethods: [],
          commonCodeSmells: [],
          overallStatistics: {
            totalMethods: 145,
            averageComplexity: 3.8,
            highComplexityCount: 2,
            veryHighComplexityCount: 0,
            averageMethodLength: 12,
            longMethodCount: 0,
          },
        },
      });

      // Use a simplified schema for this test
      const appSummarySchema = z.object({
        appDescription: z.string().optional(),
        technologies: z.array(z.unknown()).optional(),
        billOfMaterials: z.array(bomDependencySchema).optional(),
        codeQualitySummary: z
          .object({
            topComplexMethods: z.array(z.unknown()),
            commonCodeSmells: z.array(z.unknown()),
            overallStatistics: z.object({
              totalMethods: z.number(),
              averageComplexity: z.number(),
              highComplexityCount: z.number(),
              veryHighComplexityCount: z.number(),
              averageMethodLength: z.number(),
              longMethodCount: z.number(),
            }),
          })
          .optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: appSummarySchema,
      };

      const result = processor.parseAndValidate(
        llmResponse,
        { resource: "all-categories", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      // Should succeed after null-to-undefined conversion
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as unknown as Record<string, unknown>;
        expect(data.appDescription).toBe("A JHipster-based microservice application");

        const bom = data.billOfMaterials as Record<string, unknown>[];
        expect(bom).toHaveLength(2);
        expect(bom[0].groupId).toBe("org.springframework.boot");
        expect("groupId" in bom[1]).toBe(false); // Converted from null
      }
    });

    it("should convert null values at various nesting levels", () => {
      const llmResponse = JSON.stringify({
        level1: {
          value: "present",
          nullValue: null,
          level2: {
            items: [
              { id: 1, name: "item1", optional: null },
              { id: 2, name: "item2", optional: "value" },
            ],
            metadata: null,
          },
        },
        anotherTopLevel: null,
      });

      const schema = z.object({
        level1: z.object({
          value: z.string(),
          nullValue: z.string().optional(),
          level2: z.object({
            items: z.array(
              z.object({
                id: z.number(),
                name: z.string(),
                optional: z.string().optional(),
              }),
            ),
            metadata: z.string().optional(),
          }),
        }),
        anotherTopLevel: z.string().optional(),
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(
        llmResponse,
        { resource: "nested-test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        const level1 = data.level1 as Record<string, unknown>;

        expect(level1.value).toBe("present");
        expect("nullValue" in level1).toBe(false);
        expect("anotherTopLevel" in data).toBe(false);

        const level2 = level1.level2 as Record<string, unknown>;
        const items = level2.items as Record<string, unknown>[];

        expect("optional" in items[0]).toBe(false);
        expect(items[1].optional).toBe("value");
        expect("metadata" in level2).toBe(false);
      }
    });
  });

  describe("Error prevention - scenarios that previously failed", () => {
    it("should not throw validation error for optional fields with null values", () => {
      // This would have previously thrown:
      // "Expected string, received null" at path ["groupId"]
      const problematicResponse = JSON.stringify({
        name: "some-dependency",
        groupId: null, // optional field with null
        versions: ["1.0.0"],
        hasConflict: false,
        locations: ["build.gradle"], // required field
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: bomDependencySchema,
      };

      const result = processor.parseAndValidate(
        problematicResponse,
        { resource: "single-dependency", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      // Should now succeed instead of throwing validation error
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.name).toBe("some-dependency");
        expect("groupId" in data).toBe(false);
      }
    });

    it("should handle arrays with multiple null optional fields", () => {
      const response = JSON.stringify([
        { name: "dep1", groupId: "com.example", scopes: ["compile"] },
        { name: "dep2", groupId: null, scopes: null },
        { name: "dep3", groupId: null, scopes: ["test"] },
      ]);

      const schema = z.array(
        z.object({
          name: z.string(),
          groupId: z.string().optional(),
          scopes: z.array(z.string()).optional(),
        }),
      );

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      };

      const result = processor.parseAndValidate(
        response,
        { resource: "multi-null-test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as unknown as Record<string, unknown>[];
        expect(data[0].groupId).toBe("com.example");
        expect("groupId" in data[1]).toBe(false);
        expect("scopes" in data[1]).toBe(false);
        expect("groupId" in data[2]).toBe(false);
        expect(data[2].scopes).toEqual(["test"]);
      }
    });
  });

  describe("Backwards compatibility", () => {
    it("should still work correctly when null is not present", () => {
      const response = JSON.stringify({
        name: "dependency",
        groupId: "com.example",
        versions: ["1.0.0"],
        hasConflict: false,
        locations: ["build.gradle"],
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: bomDependencySchema,
      };

      const result = processor.parseAndValidate(
        response,
        { resource: "no-null-test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.name).toBe("dependency");
        expect(data.groupId).toBe("com.example");
      }
    });

    it("should still work when optional fields are omitted entirely", () => {
      const response = JSON.stringify({
        name: "dependency",
        versions: ["1.0.0"],
        hasConflict: false,
        locations: ["package.json"],
      });

      const completionOptions: LLMCompletionOptions = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: bomDependencySchema,
      };

      const result = processor.parseAndValidate(
        response,
        { resource: "omitted-test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(data.name).toBe("dependency");
        expect("groupId" in data).toBe(false);
      }
    });
  });
});

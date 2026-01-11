import { z } from "zod";
import {
  commonSourceAnalysisSchema,
  sourceSummarySchema,
  type CommonSourceAnalysis,
} from "../../../src/app/schemas/sources.schema";

describe("commonSourceAnalysisSchema", () => {
  /**
   * Expected fields in the common source analysis schema.
   * These represent the standard structure for code file analysis.
   */
  const EXPECTED_FIELDS = [
    "name",
    "kind",
    "namespace",
    "purpose",
    "implementation",
    "internalReferences",
    "externalReferences",
    "publicConstants",
    "publicFunctions",
    "databaseIntegration",
    "integrationPoints",
    "codeQualityMetrics",
  ] as const;

  describe("Schema Structure", () => {
    it("should be a pick of sourceSummarySchema with expected fields", () => {
      const schemaShape = Object.keys(
        (commonSourceAnalysisSchema as z.ZodObject<z.ZodRawShape>).shape,
      );
      expect(schemaShape.sort()).toEqual([...EXPECTED_FIELDS].sort());
    });

    it("should have exactly 12 fields", () => {
      const schemaShape = Object.keys(
        (commonSourceAnalysisSchema as z.ZodObject<z.ZodRawShape>).shape,
      );
      expect(schemaShape).toHaveLength(12);
    });

    it("should be a subset of sourceSummarySchema", () => {
      const commonFields = Object.keys(
        (commonSourceAnalysisSchema as z.ZodObject<z.ZodRawShape>).shape,
      );
      const fullSchemaFields = Object.keys(
        (sourceSummarySchema as z.ZodObject<z.ZodRawShape>).shape,
      );

      // Every field in commonSourceAnalysisSchema should exist in sourceSummarySchema
      for (const field of commonFields) {
        expect(fullSchemaFields).toContain(field);
      }
    });
  });

  describe("Validation", () => {
    it("should validate a valid source analysis object", () => {
      const validData: CommonSourceAnalysis = {
        name: "TestClass",
        kind: "CLASS",
        namespace: "com.example.TestClass",
        purpose: "Test purpose description that is detailed and informative.",
        implementation: "Test implementation description with details about how it works.",
        internalReferences: ["com.example.OtherClass", "com.example.Helper"],
        externalReferences: [
          "org.springframework.context.ApplicationContext",
          "javax.persistence.Entity",
        ],
        publicConstants: [{ name: "MAX_SIZE", value: "100", type: "int" }],
        publicFunctions: [
          {
            name: "doSomething",
            purpose: "Does something important for the business logic.",
            returnType: "void",
            description: "Implementation details about the method.",
          },
        ],
        databaseIntegration: {
          mechanism: "NONE",
          description: "No database integration",
          codeExample: "n/a",
        },
        integrationPoints: [],
        codeQualityMetrics: {
          totalFunctions: 1,
        },
      };

      const result = commonSourceAnalysisSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should validate a minimal valid object with only required fields", () => {
      const minimalData = {
        purpose: "Minimal purpose description.",
        implementation: "Minimal implementation details.",
      };

      const result = commonSourceAnalysisSchema.safeParse(minimalData);
      expect(result.success).toBe(true);
    });

    it("should reject objects missing required purpose field", () => {
      const invalidData = {
        name: "TestClass",
        implementation: "Some implementation",
        // Missing purpose
      };

      const result = commonSourceAnalysisSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject objects missing required implementation field", () => {
      const invalidData = {
        name: "TestClass",
        purpose: "Some purpose",
        // Missing implementation
      };

      const result = commonSourceAnalysisSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should accept valid kind values", () => {
      const validKinds = ["CLASS", "INTERFACE", "ENUM", "MODULE", "FUNCTION"];

      for (const kind of validKinds) {
        const data = {
          purpose: "Test purpose",
          implementation: "Test implementation",
          kind,
        };
        const result = commonSourceAnalysisSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it("should normalize invalid kind values to INVALID", () => {
      const data = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        kind: "NOT_A_VALID_KIND",
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("INVALID");
      }
    });
  });

  describe("Type Safety", () => {
    it("should infer correct TypeScript type", () => {
      // This is a compile-time test - if CommonSourceAnalysis type is correct,
      // these assignments should compile without errors
      const validData: CommonSourceAnalysis = {
        purpose: "Test",
        implementation: "Test",
      };

      expect(validData).toBeDefined();
    });

    it("should allow optional fields to be undefined", () => {
      const data: CommonSourceAnalysis = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        // All other fields are optional
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("Array Fields", () => {
    it("should validate internalReferences as string array", () => {
      const data = {
        purpose: "Test",
        implementation: "Test",
        internalReferences: ["ref1", "ref2", "ref3"],
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate externalReferences as string array", () => {
      const data = {
        purpose: "Test",
        implementation: "Test",
        externalReferences: ["org.external.Lib", "javax.external.Package"],
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate publicConstants as array of objects", () => {
      const data = {
        purpose: "Test",
        implementation: "Test",
        publicConstants: [
          { name: "CONST_A", value: "1", type: "int" },
          { name: "CONST_B", value: "hello", type: "String" },
        ],
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate publicFunctions as array of objects", () => {
      const data = {
        purpose: "Test",
        implementation: "Test",
        publicFunctions: [
          {
            name: "methodA",
            purpose: "Does A",
            returnType: "void",
            description: "Implementation of A",
          },
          {
            name: "methodB",
            purpose: "Does B",
            returnType: "String",
            description: "Implementation of B",
          },
        ],
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe("Nested Object Fields", () => {
    it("should validate databaseIntegration object", () => {
      const data = {
        purpose: "Test",
        implementation: "Test",
        databaseIntegration: {
          mechanism: "JDBC",
          description: "Uses JDBC for database access",
          codeExample: "connection.prepareStatement(sql)",
          databaseName: "mydb",
          tablesAccessed: ["users", "orders"],
          operationType: ["READ", "WRITE"],
        },
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate codeQualityMetrics object", () => {
      const data = {
        purpose: "Test",
        implementation: "Test",
        codeQualityMetrics: {
          totalFunctions: 10,
          averageComplexity: 5.5,
          maxComplexity: 15,
          averageFunctionLength: 25,
          fileSmells: ["LARGE FILE"],
        },
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("should validate integrationPoints array", () => {
      const data = {
        purpose: "Test",
        implementation: "Test",
        integrationPoints: [
          {
            mechanism: "REST",
            name: "getUserEndpoint",
            description: "REST endpoint for fetching users",
            path: "/api/users/{id}",
            method: "GET",
          },
        ],
      };

      const result = commonSourceAnalysisSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });
});


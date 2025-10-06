import { z } from "zod";
import { sourceSummarySchema } from "../../src/schemas/sources.schema";

/**
 * Tests for source schema field names - NEW field names (after refactoring)
 * These tests verify the refactored field names: name, kind, namespace
 */
describe("Source Schema Fields - NEW Names", () => {
  describe("sourceSummarySchema", () => {
    it("should have field named 'name'", () => {
      const testData = {
        purpose: "Test purpose for testing schema validation.",
        implementation: "Test implementation details that include business logic and processing.",
        name: "TestClass",
      };

      const result = sourceSummarySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("TestClass");
      }
    });

    it("should have field named 'kind' with enum values", () => {
      const testData = {
        purpose: "Test purpose for testing schema validation.",
        implementation: "Test implementation details that include business logic and processing.",
        kind: "class" as const,
      };

      const result = sourceSummarySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("class");
      }
    });

    it("should accept all valid kind enum values", () => {
      const validTypes: (
        | "class"
        | "interface"
        | "record"
        | "struct"
        | "enum"
        | "annotation-type"
        | "module"
      )[] = ["class", "interface", "record", "struct", "enum", "annotation-type", "module"];

      validTypes.forEach((type) => {
        const testData = {
          purpose: "Test purpose for testing schema validation.",
          implementation: "Test implementation details that include business logic and processing.",
          kind: type,
        };

        const result = sourceSummarySchema.safeParse(testData);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.kind).toBe(type);
        }
      });
    });

    it("should have field named 'namespace'", () => {
      const testData = {
        purpose: "Test purpose for testing schema validation.",
        implementation: "Test implementation details that include business logic and processing.",
        namespace: "com.example.TestClass",
      };

      const result = sourceSummarySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namespace).toBe("com.example.TestClass");
      }
    });

    it("should allow all three fields together", () => {
      const testData = {
        purpose: "Test purpose for testing schema validation.",
        implementation: "Test implementation details that include business logic and processing.",
        name: "TestClass",
        kind: "class" as const,
        namespace: "com.example.TestClass",
      };

      const result = sourceSummarySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("TestClass");
        expect(result.data.kind).toBe("class");
        expect(result.data.namespace).toBe("com.example.TestClass");
      }
    });

    it("should make name, kind, and namespace optional", () => {
      const testData = {
        purpose: "Test purpose for testing schema validation.",
        implementation: "Test implementation details that include business logic and processing.",
      };

      const result = sourceSummarySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBeUndefined();
        expect(result.data.kind).toBeUndefined();
        expect(result.data.namespace).toBeUndefined();
      }
    });
  });

  describe("schema.pick() operations", () => {
    it("should support picking name field", () => {
      const pickedSchema = sourceSummarySchema.pick({ name: true });
      const testData = { name: "PickedClass" };

      const result = pickedSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("PickedClass");
      }
    });

    it("should support picking kind field", () => {
      const pickedSchema = sourceSummarySchema.pick({ kind: true });
      const testData = { kind: "interface" as const };

      const result = pickedSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("interface");
      }
    });

    it("should support picking namespace field", () => {
      const pickedSchema = sourceSummarySchema.pick({ namespace: true });
      const testData = { namespace: "com.test.PickedClass" };

      const result = pickedSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namespace).toBe("com.test.PickedClass");
      }
    });

    it("should support picking all three fields together", () => {
      const pickedSchema = sourceSummarySchema.pick({
        name: true,
        kind: true,
        namespace: true,
      });
      const testData = {
        name: "MultiField",
        kind: "record" as const,
        namespace: "com.test.MultiField",
      };

      const result = pickedSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("MultiField");
        expect(result.data.kind).toBe("record");
        expect(result.data.namespace).toBe("com.test.MultiField");
      }
    });
  });

  describe("TypeScript type inference", () => {
    it("should infer correct types for new field names", () => {
      type SourceSummary = z.infer<typeof sourceSummarySchema>;

      // This test verifies that TypeScript correctly infers the types
      const summary: SourceSummary = {
        purpose: "Test purpose for testing schema validation.",
        implementation: "Test implementation details that include business logic and processing.",
        name: "InferredClass",
        kind: "struct",
        namespace: "com.test.InferredClass",
      };

      // Type assertions to ensure the fields exist with correct types
      const name: string | undefined = summary.name;
      const kind:
        | "class"
        | "interface"
        | "record"
        | "struct"
        | "enum"
        | "annotation-type"
        | "module"
        | undefined = summary.kind;
      const namespace: string | undefined = summary.namespace;

      expect(name).toBe("InferredClass");
      expect(kind).toBe("struct");
      expect(namespace).toBe("com.test.InferredClass");
    });
  });
});

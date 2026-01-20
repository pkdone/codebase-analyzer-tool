import { z } from "zod";
import { sourceSummarySchema, scheduledJobSchema } from "../../../src/app/schemas/sources.schema";
import {
  SOURCE_ENTITY_KIND_VALUES,
  COMPLEXITY_VALUES,
  DEFAULT_COMPLEXITY,
  COMPLEXITY_VALUES_SET,
  type ComplexityValue,
} from "../../../src/app/schemas/sources.enums";

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
        kind: "CLASS" as const,
      };

      const result = sourceSummarySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("CLASS");
      }
    });

    it("should accept all valid kind enum values (centralized)", () => {
      for (const type of SOURCE_ENTITY_KIND_VALUES) {
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
      }
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
        kind: "CLASS" as const,
        namespace: "com.example.TestClass",
      };

      const result = sourceSummarySchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("TestClass");
        expect(result.data.kind).toBe("CLASS");
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
      const testData = { kind: "INTERFACE" as const };

      const result = pickedSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.kind).toBe("INTERFACE");
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
        kind: "RECORD" as const,
        namespace: "com.test.MultiField",
      };

      const result = pickedSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("MultiField");
        expect(result.data.kind).toBe("RECORD");
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
        kind: "STRUCT",
        namespace: "com.test.InferredClass",
      };

      // Type assertions to ensure the fields exist with correct types
      const name: string | undefined = summary.name;
      const kind: (typeof SOURCE_ENTITY_KIND_VALUES)[number] | "INVALID" | undefined = summary.kind;
      const namespace: string | undefined = summary.namespace;

      expect(name).toBe("InferredClass");
      expect(kind).toBe("STRUCT");
      expect(namespace).toBe("com.test.InferredClass");
    });
  });
});

/**
 * Tests for scheduledJobSchema
 */
describe("Scheduled Job Schema", () => {
  it("should validate a complete scheduled job", () => {
    const testData = {
      jobName: "DailyBackup",
      trigger: "cron: 0 2 * * *",
      purpose: "Performs daily backup of database",
      inputResources: ["/data/database", "/config/backup.conf"],
      outputResources: ["/backups/daily"],
      dependencies: ["mount-backup-volume.sh"],
      estimatedDuration: "30 minutes",
    };

    const result = scheduledJobSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobName).toBe("DailyBackup");
      expect(result.data.trigger).toBe("cron: 0 2 * * *");
      expect(result.data.purpose).toBe("Performs daily backup of database");
      expect(result.data.inputResources).toEqual(["/data/database", "/config/backup.conf"]);
      expect(result.data.outputResources).toEqual(["/backups/daily"]);
      expect(result.data.dependencies).toEqual(["mount-backup-volume.sh"]);
      expect(result.data.estimatedDuration).toBe("30 minutes");
    }
  });

  it("should validate a minimal scheduled job with only required fields", () => {
    const testData = {
      jobName: "MinimalJob",
      trigger: "manual",
      purpose: "A simple manual job",
    };

    const result = scheduledJobSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.jobName).toBe("MinimalJob");
      expect(result.data.trigger).toBe("manual");
      expect(result.data.purpose).toBe("A simple manual job");
      expect(result.data.inputResources).toBeUndefined();
      expect(result.data.outputResources).toBeUndefined();
      expect(result.data.dependencies).toBeUndefined();
      expect(result.data.estimatedDuration).toBeUndefined();
    }
  });

  it("should fail validation when required fields are missing", () => {
    const testData = {
      jobName: "InvalidJob",
      // missing trigger and purpose
    };

    const result = scheduledJobSchema.safeParse(testData);
    expect(result.success).toBe(false);
  });

  it("should validate various trigger types", () => {
    const triggers = [
      "cron: 0 2 * * *",
      "manual",
      "event-driven",
      "scheduled",
      "systemd-timer",
      "task-scheduler",
    ];

    for (const trigger of triggers) {
      const testData = {
        jobName: "TestJob",
        trigger,
        purpose: "Test job with different triggers",
      };

      const result = scheduledJobSchema.safeParse(testData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.trigger).toBe(trigger);
      }
    }
  });

  it("should allow empty arrays for optional resource fields", () => {
    const testData = {
      jobName: "NoResourcesJob",
      trigger: "manual",
      purpose: "Job with no resources",
      inputResources: [],
      outputResources: [],
      dependencies: [],
    };

    const result = scheduledJobSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.inputResources).toEqual([]);
      expect(result.data.outputResources).toEqual([]);
      expect(result.data.dependencies).toEqual([]);
    }
  });
});

/**
 * Tests for scheduledJobs field in sourceSummarySchema
 */
describe("Source Summary Schema - scheduledJobs field", () => {
  it("should accept scheduledJobs array in sourceSummarySchema", () => {
    const testData = {
      purpose: "Test script purpose",
      implementation: "Test script implementation",
      scheduledJobs: [
        {
          jobName: "Job1",
          trigger: "cron: 0 1 * * *",
          purpose: "First job",
        },
        {
          jobName: "Job2",
          trigger: "manual",
          purpose: "Second job",
          inputResources: ["/data/input"],
        },
      ],
    };

    const result = sourceSummarySchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledJobs).toBeDefined();
      expect(result.data.scheduledJobs?.length).toBe(2);
      expect(result.data.scheduledJobs?.[0].jobName).toBe("Job1");
      expect(result.data.scheduledJobs?.[1].jobName).toBe("Job2");
    }
  });

  it("should make scheduledJobs optional", () => {
    const testData = {
      purpose: "Test script purpose",
      implementation: "Test script implementation",
    };

    const result = sourceSummarySchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledJobs).toBeUndefined();
    }
  });

  it("should support picking scheduledJobs field", () => {
    const pickedSchema = sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    });

    const testData = {
      purpose: "Test script purpose",
      implementation: "Test script implementation",
      scheduledJobs: [
        {
          jobName: "PickedJob",
          trigger: "event-driven",
          purpose: "Test picked job",
        },
      ],
    };

    const result = pickedSchema.safeParse(testData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledJobs).toBeDefined();
      expect(result.data.scheduledJobs?.[0].jobName).toBe("PickedJob");
    }
  });
});

/**
 * Tests for COMPLEXITY_VALUES and DEFAULT_COMPLEXITY constants
 */
describe("Complexity Constants", () => {
  describe("COMPLEXITY_VALUES", () => {
    it("should define expected complexity levels", () => {
      expect(COMPLEXITY_VALUES).toContain("LOW");
      expect(COMPLEXITY_VALUES).toContain("MEDIUM");
      expect(COMPLEXITY_VALUES).toContain("HIGH");
      expect(COMPLEXITY_VALUES).toContain("INVALID");
    });

    it("should have exactly 4 complexity values", () => {
      expect(COMPLEXITY_VALUES.length).toBe(4);
    });

    it("should be typed as a readonly tuple (compile-time check)", () => {
      // TypeScript's 'as const' provides compile-time immutability
      // This test verifies the expected values at runtime
      const expectedValues = ["LOW", "MEDIUM", "HIGH", "INVALID"];
      expect([...COMPLEXITY_VALUES]).toEqual(expectedValues);
    });

    it("should have LOW as the first element", () => {
      expect(COMPLEXITY_VALUES[0]).toBe("LOW");
    });
  });

  describe("DEFAULT_COMPLEXITY", () => {
    it("should be a valid complexity value", () => {
      expect(COMPLEXITY_VALUES).toContain(DEFAULT_COMPLEXITY);
    });

    it("should equal LOW", () => {
      expect(DEFAULT_COMPLEXITY).toBe("LOW");
    });

    it("should be the first element of COMPLEXITY_VALUES (ensuring schema alignment)", () => {
      expect(DEFAULT_COMPLEXITY).toBe(COMPLEXITY_VALUES[0]);
    });

    it("should be present in COMPLEXITY_VALUES_SET", () => {
      expect(COMPLEXITY_VALUES_SET.has(DEFAULT_COMPLEXITY)).toBe(true);
    });

    it("should satisfy ComplexityValue type", () => {
      // TypeScript type check - this compiles if the type is correct
      const complexityValue: ComplexityValue = DEFAULT_COMPLEXITY;
      expect(complexityValue).toBe("LOW");
    });
  });

  describe("COMPLEXITY_VALUES_SET", () => {
    it("should contain all COMPLEXITY_VALUES", () => {
      for (const value of COMPLEXITY_VALUES) {
        expect(COMPLEXITY_VALUES_SET.has(value)).toBe(true);
      }
    });

    it("should have the same size as COMPLEXITY_VALUES array", () => {
      expect(COMPLEXITY_VALUES_SET.size).toBe(COMPLEXITY_VALUES.length);
    });

    it("should not contain invalid values", () => {
      expect(COMPLEXITY_VALUES_SET.has("VERY_HIGH")).toBe(false);
      expect(COMPLEXITY_VALUES_SET.has("UNKNOWN")).toBe(false);
      expect(COMPLEXITY_VALUES_SET.has("")).toBe(false);
    });
  });
});

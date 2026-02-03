import {
  createDependencyConfig,
  createBasicInfoBlock,
  createScheduledJobConfig,
  createStandardCodeConfig,
  scheduledJobFileSchema,
} from "../../../../../../src/app/prompts/sources/definitions/source-config-factories";
import {
  INSTRUCTION_SECTION_TITLES,
  buildInstructionBlock,
} from "../../../../../../src/app/prompts/sources/utils";
import {
  COMMON_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  SHELL_SCRIPT_SPECIFIC_FRAGMENTS,
  BATCH_SCRIPT_SPECIFIC_FRAGMENTS,
  JCL_SPECIFIC_FRAGMENTS,
  JAVA_SPECIFIC_FRAGMENTS,
} from "../../../../../../src/app/prompts/sources/fragments";

describe("source-config-factories", () => {
  describe("createBasicInfoBlock", () => {
    it("should create the standard Basic Info block", () => {
      const result = createBasicInfoBlock();

      expect(result).toContain("__Basic Information__");
      expect(result).toContain(COMMON_FRAGMENTS.PURPOSE);
      expect(result).toContain(COMMON_FRAGMENTS.IMPLEMENTATION);
    });

    it("should match the manual construction pattern", () => {
      const manual = buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        COMMON_FRAGMENTS.PURPOSE,
        COMMON_FRAGMENTS.IMPLEMENTATION,
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
        COMMON_FRAGMENTS.PURPOSE,
        COMMON_FRAGMENTS.IMPLEMENTATION,
      );

      expect(config.instructions[0]).toBe(expectedBasicInfo);
    });
  });

  describe("createScheduledJobConfig", () => {
    it("should use createBasicInfoBlock for Basic Info section", () => {
      const config = createScheduledJobConfig(
        "the Shell script (bash/sh)",
        SHELL_SCRIPT_SPECIFIC_FRAGMENTS.CRON_EXPRESSIONS,
      );

      expect(config.instructions[0]).toBe(createBasicInfoBlock());
    });

    it("should produce correct structure with Basic Info and Scheduled Jobs sections", () => {
      const config = createScheduledJobConfig(
        "the Shell script (bash/sh)",
        SHELL_SCRIPT_SPECIFIC_FRAGMENTS.CRON_EXPRESSIONS,
        SHELL_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS,
      );

      expect(config.instructions).toHaveLength(2);
      expect(config.instructions[0]).toContain("__Basic Information__");
      expect(config.instructions[1]).toContain("__Scheduled Jobs__");
    });

    it("should include common scheduled job fragments in the instruction block", () => {
      const config = createScheduledJobConfig("test script", "custom fragment");

      expect(config.instructions[1]).toContain(SCHEDULED_JOBS_FRAGMENTS.INTRO);
      expect(config.instructions[1]).toContain(SCHEDULED_JOBS_FRAGMENTS.FIELDS);
      expect(config.instructions[1]).toContain("custom fragment");
    });

    it("should include all provided job-specific fragments", () => {
      const config = createScheduledJobConfig(
        "the Shell script (bash/sh)",
        SHELL_SCRIPT_SPECIFIC_FRAGMENTS.CRON_EXPRESSIONS,
        SHELL_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS,
        SHELL_SCRIPT_SPECIFIC_FRAGMENTS.EXTERNAL_API_CALLS,
      );

      const jobsBlock = config.instructions[1];
      expect(jobsBlock).toContain(SHELL_SCRIPT_SPECIFIC_FRAGMENTS.CRON_EXPRESSIONS);
      expect(jobsBlock).toContain(SHELL_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS);
      expect(jobsBlock).toContain(SHELL_SCRIPT_SPECIFIC_FRAGMENTS.EXTERNAL_API_CALLS);
    });

    it("should have correct schema fields (purpose, implementation, scheduledJobs)", () => {
      const config = createScheduledJobConfig("test", "fragment");
      // Type assertion matches existing patterns in this test file
      const schemaShape = Object.keys(
        (config.responseSchema as { shape: Record<string, unknown> }).shape,
      ).sort();
      expect(schemaShape).toEqual(["implementation", "purpose", "scheduledJobs"]);
    });

    it("should use the scheduledJobFileSchema", () => {
      const config = createScheduledJobConfig("test", "fragment");
      expect(config.responseSchema).toBe(scheduledJobFileSchema);
    });

    it("should set contentDesc correctly", () => {
      const config = createScheduledJobConfig("the Windows batch script (.bat/.cmd)", "fragment");
      expect(config.contentDesc).toBe("the Windows batch script (.bat/.cmd)");
    });

    it("should work with batch script specific fragments", () => {
      const config = createScheduledJobConfig(
        "the Windows batch script (.bat/.cmd)",
        BATCH_SCRIPT_SPECIFIC_FRAGMENTS.TASK_SCHEDULER,
        BATCH_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS,
        BATCH_SCRIPT_SPECIFIC_FRAGMENTS.NETWORK_OPS,
        BATCH_SCRIPT_SPECIFIC_FRAGMENTS.SERVICE_OPS,
      );

      const jobsBlock = config.instructions[1];
      expect(jobsBlock).toContain(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.TASK_SCHEDULER);
      expect(jobsBlock).toContain(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS);
      expect(jobsBlock).toContain(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.NETWORK_OPS);
      expect(jobsBlock).toContain(BATCH_SCRIPT_SPECIFIC_FRAGMENTS.SERVICE_OPS);
    });

    it("should work with JCL specific fragments", () => {
      const config = createScheduledJobConfig(
        "the Mainframe JCL (Job Control Language)",
        JCL_SPECIFIC_FRAGMENTS.EXEC_STATEMENTS,
        JCL_SPECIFIC_FRAGMENTS.DD_STATEMENTS,
        JCL_SPECIFIC_FRAGMENTS.COND_PARAMETERS,
        JCL_SPECIFIC_FRAGMENTS.SORT_UTILITIES,
      );

      const jobsBlock = config.instructions[1];
      expect(jobsBlock).toContain(JCL_SPECIFIC_FRAGMENTS.EXEC_STATEMENTS);
      expect(jobsBlock).toContain(JCL_SPECIFIC_FRAGMENTS.DD_STATEMENTS);
      expect(jobsBlock).toContain(JCL_SPECIFIC_FRAGMENTS.COND_PARAMETERS);
      expect(jobsBlock).toContain(JCL_SPECIFIC_FRAGMENTS.SORT_UTILITIES);
    });

    it("should produce valid Zod schema that can parse data", () => {
      const config = createScheduledJobConfig("test", "fragment");

      const testData = {
        purpose: "Test purpose",
        implementation: "Test implementation",
        scheduledJobs: [
          {
            jobName: "daily-backup",
            trigger: "cron: 0 2 * * *",
            purpose: "Backup database",
            inputResources: ["database"],
            outputResources: ["backup file"],
            dependencies: [],
          },
        ],
      };

      const parseResult = config.responseSchema.safeParse(testData);
      expect(parseResult.success).toBe(true);
    });

    it("should not set hasComplexSchema property", () => {
      const config = createScheduledJobConfig("test", "fragment");
      expect(config.hasComplexSchema).toBeUndefined();
    });
  });

  describe("createStandardCodeConfig", () => {
    it("should include presentation values for self-describing configs", () => {
      const config = createStandardCodeConfig("the JVM code", JAVA_SPECIFIC_FRAGMENTS);

      // Self-describing configs include dataBlockHeader and wrapInCodeBlock
      expect(config.dataBlockHeader).toBe("CODE");
      expect(config.wrapInCodeBlock).toBe(true);
    });

    it("should have required config fields", () => {
      const config = createStandardCodeConfig("the JVM code", JAVA_SPECIFIC_FRAGMENTS);

      expect(config.contentDesc).toBe("the JVM code");
      expect(config.responseSchema).toBeDefined();
      expect(config.instructions).toBeDefined();
      expect(config.instructions.length).toBe(5);
    });
  });
});

import "reflect-metadata";
import { jest, describe, test, expect, beforeEach, afterEach } from "@jest/globals";
import { container } from "tsyringe";
import { CodebaseCaptureTask } from "../../../src/tasks/codebase-capture.task";
import { TOKENS } from "../../../src/di/tokens";
import type { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";
import LLMRouter from "../../../src/llm/core/llm-router";
import CodebaseToDBLoader from "../../../src/components/capture/codebase-to-db-loader";
import type { EnvVars } from "../../../src/env/env.types";

// Mock dependencies at module level
jest.mock("../../../src/repositories/source/sources.repository");
jest.mock("../../../src/llm/core/llm-router");
jest.mock("../../../src/components/capture/codebase-to-db-loader");

describe("CodebaseCaptureTask Integration Tests", () => {
  let codebaseCaptureTask: CodebaseCaptureTask;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockCodebaseToDbLoader: jest.Mocked<CodebaseToDBLoader>;
  let mockEnvVars: EnvVars;

  beforeEach(() => {
    jest.clearAllMocks();
    container.clearInstances();

    // Create mock implementations
    mockSourcesRepository = {
      deleteSourcesByProject: jest.fn(),
      insertMany: jest.fn(),
      getProjectFilesCount: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    mockLLMRouter = {
      generateEmbeddings: jest.fn(),
      executeCompletion: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<LLMRouter>;

    mockCodebaseToDbLoader = {
      loadIntoDB: jest.fn(),
    } as unknown as jest.Mocked<CodebaseToDBLoader>;

    mockEnvVars = {
      MONGODB_URL: "mongodb://localhost:27017/test",
      CODEBASE_DIR_PATH: "/test/project",
      SKIP_ALREADY_PROCESSED_FILES: false,
      LLM: "TestProvider",
    } as EnvVars;

    // Register mocks in DI container
    container.registerInstance(TOKENS.SourcesRepository, mockSourcesRepository);
    container.registerInstance(TOKENS.LLMRouter, mockLLMRouter);
    container.registerInstance(TOKENS.CodebaseToDBLoader, mockCodebaseToDbLoader);
    container.registerInstance(TOKENS.EnvVars, mockEnvVars);

    // Create mock for LLMStatsReporter and DBInitializerTask
    const mockLLMStatsReporter = {
      displayLLMStatusSummary: jest.fn(),
      displayLLMStatusDetails: jest.fn(),
    } as any;
    const mockDBInitializerTask = { execute: jest.fn() } as any;

    // Create task instance
    codebaseCaptureTask = new CodebaseCaptureTask(
      mockLLMRouter,
      mockLLMStatsReporter,
      mockDBInitializerTask,
      mockEnvVars,
      "test-project",
      mockCodebaseToDbLoader,
    );
  });

  afterEach(() => {
    container.clearInstances();
  });

  describe("Successful Execution", () => {
    test("should execute complete codebase capture flow when SKIP_ALREADY_PROCESSED_FILES is false", async () => {
      // Mock dependencies
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);
      mockCodebaseToDbLoader.loadIntoDB.mockResolvedValue();

      // Execute task
      await codebaseCaptureTask.execute();

      // Verify execution flow
      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalled();
      expect(mockCodebaseToDbLoader.loadIntoDB).toHaveBeenCalledWith(
        "test-project",
        "/test/project",
        false,
      );
      expect(mockLLMRouter.close).toHaveBeenCalled();
    });

    test("should skip processing when SKIP_ALREADY_PROCESSED_FILES is true and files exist", async () => {
      // Set environment to skip processing
      const envWithSkip = { ...mockEnvVars, SKIP_ALREADY_PROCESSED_FILES: true };
      container.registerInstance(TOKENS.EnvVars, envWithSkip);

      const mockLLMStatsReporter = { reportStats: jest.fn() } as any;
      const mockDBInitializerTask = { execute: jest.fn() } as any;

      const taskWithSkip = new CodebaseCaptureTask(
        mockLLMRouter,
        mockLLMStatsReporter,
        mockDBInitializerTask,
        envWithSkip,
        "test-project",
        mockCodebaseToDbLoader,
      );

      // Mock existing files
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(15);

      // Execute task
      await taskWithSkip.execute();

      // Verify that processing was skipped
      expect(mockSourcesRepository.deleteSourcesByProject).not.toHaveBeenCalled();
      expect(mockCodebaseToDbLoader.loadIntoDB).not.toHaveBeenCalled();
      expect(mockLLMRouter.close).toHaveBeenCalled();
    });

    test("should process when SKIP_ALREADY_PROCESSED_FILES is true but no files exist", async () => {
      // Set environment to skip processing
      const envWithSkip = { ...mockEnvVars, SKIP_ALREADY_PROCESSED_FILES: true };
      container.registerInstance(TOKENS.EnvVars, envWithSkip);

      const mockLLMStatsReporter = { reportStats: jest.fn() } as any;
      const mockDBInitializerTask = { execute: jest.fn() } as any;

      const taskWithSkip = new CodebaseCaptureTask(
        mockLLMRouter,
        mockLLMStatsReporter,
        mockDBInitializerTask,
        envWithSkip,
        "test-project",
        mockCodebaseToDbLoader,
      );

      // Mock no existing files
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);

      // Execute task
      await taskWithSkip.execute();

      // Verify that processing occurred
      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalled();
      expect(mockCodebaseToDbLoader.loadIntoDB).toHaveBeenCalledWith("/test/project");
      expect(mockLLMRouter.close).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    test("should handle repository errors gracefully", async () => {
      mockSourcesRepository.getProjectFilesCount.mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(codebaseCaptureTask.execute()).rejects.toThrow("Database connection failed");

      // LLM should still be closed even on error
      expect(mockLLMRouter.close).toHaveBeenCalled();
    });

    test("should handle codebase loader errors gracefully", async () => {
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);
      mockCodebaseToDbLoader.loadIntoDB.mockRejectedValue(new Error("File system error"));

      await expect(codebaseCaptureTask.execute()).rejects.toThrow("File system error");

      // Verify cleanup still happens
      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalled();
      expect(mockLLMRouter.close).toHaveBeenCalled();
    });

    test("should handle collection drop errors gracefully", async () => {
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);
      mockSourcesRepository.deleteSourcesByProject.mockRejectedValue(
        new Error("Failed to drop collection"),
      );

      await expect(codebaseCaptureTask.execute()).rejects.toThrow("Failed to drop collection");

      // LLM should still be closed
      expect(mockLLMRouter.close).toHaveBeenCalled();
    });

    test("should handle LLM router close errors gracefully", async () => {
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);
      mockCodebaseToDbLoader.loadIntoDB.mockResolvedValue();
      mockLLMRouter.close.mockRejectedValue(new Error("LLM close failed"));

      // Should not throw even if LLM close fails
      await expect(codebaseCaptureTask.execute()).resolves.not.toThrow();

      // Other operations should still complete
      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalled();
      expect(mockCodebaseToDbLoader.loadIntoDB).toHaveBeenCalled();
    });
  });

  describe("Environment Configuration", () => {
    test("should use correct codebase directory path from environment", async () => {
      const customPath = "/custom/project/path";
      const customEnv = { ...mockEnvVars, CODEBASE_DIR_PATH: customPath };

      const mockLLMStatsReporter = { reportStats: jest.fn() } as any;
      const mockDBInitializerTask = { execute: jest.fn() } as any;

      const customTask = new CodebaseCaptureTask(
        mockLLMRouter,
        mockLLMStatsReporter,
        mockDBInitializerTask,
        customEnv,
        "test-project",
        mockCodebaseToDbLoader,
      );

      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);

      await customTask.execute();

      expect(mockCodebaseToDbLoader.loadIntoDB).toHaveBeenCalledWith(
        "test-project",
        customPath,
        false,
      );
    });

    test("should handle different skip processing flag values", async () => {
      const testCases = [
        { skip: true, description: "when skip is true" },
        { skip: false, description: "when skip is false" },
      ];

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const testEnv = { ...mockEnvVars, SKIP_ALREADY_PROCESSED_FILES: testCase.skip };
        const mockLLMStatsReporter = {
          displayLLMStatusSummary: jest.fn(),
          displayLLMStatusDetails: jest.fn(),
        } as any;
        const mockDBInitializerTask = { execute: jest.fn() } as any;

        const testTask = new CodebaseCaptureTask(
          mockLLMRouter,
          mockLLMStatsReporter,
          mockDBInitializerTask,
          testEnv,
          "test-project",
          mockCodebaseToDbLoader,
        );

        // Mock existing files to test skip behavior
        mockSourcesRepository.getProjectFilesCount.mockResolvedValue(10);

        await testTask.execute();

        if (testCase.skip) {
          expect(mockCodebaseToDbLoader.loadIntoDB).not.toHaveBeenCalled();
        } else {
          expect(mockCodebaseToDbLoader.loadIntoDB).toHaveBeenCalled();
        }
      }
    });
  });

  describe("Dependency Interaction", () => {
    test("should call dependencies in correct order", async () => {
      const callOrder: string[] = [];

      mockSourcesRepository.getProjectFilesCount.mockImplementation(async () => {
        callOrder.push("getProjectFilesCount");
        return 0;
      });

      mockSourcesRepository.deleteSourcesByProject.mockImplementation(async () => {
        callOrder.push("deleteSourcesByProject");
      });

      mockCodebaseToDbLoader.loadIntoDB.mockImplementation(async () => {
        callOrder.push("loadIntoDB");
      });

      mockLLMRouter.close.mockImplementation(async () => {
        callOrder.push("llmClose");
      });

      await codebaseCaptureTask.execute();

      expect(callOrder).toEqual([
        "getProjectFilesCount",
        "deleteSourcesByProject",
        "loadIntoDB",
        "llmClose",
      ]);
    });

    test("should pass correct parameters between dependencies", async () => {
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);

      await codebaseCaptureTask.execute();

      // Verify parameter passing
      expect(mockCodebaseToDbLoader.loadIntoDB).toHaveBeenCalledWith(mockEnvVars.CODEBASE_DIR_PATH);
    });
  });

  describe("Performance and Resource Management", () => {
    test("should ensure LLM router is always closed regardless of success or failure", async () => {
      const scenarios = [
        {
          description: "successful execution",
          setup: () => {
            mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);
            mockCodebaseToDbLoader.loadIntoDB.mockResolvedValue();
          },
          shouldThrow: false,
        },
        {
          description: "repository error",
          setup: () => {
            mockSourcesRepository.getProjectFilesCount.mockRejectedValue(new Error("DB error"));
          },
          shouldThrow: true,
        },
        {
          description: "loader error",
          setup: () => {
            mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);
            mockCodebaseToDbLoader.loadIntoDB.mockRejectedValue(new Error("Loader error"));
          },
          shouldThrow: true,
        },
      ];

      for (const scenario of scenarios) {
        jest.clearAllMocks();
        scenario.setup();

        if (scenario.shouldThrow) {
          await expect(codebaseCaptureTask.execute()).rejects.toThrow();
        } else {
          await codebaseCaptureTask.execute();
        }

        expect(mockLLMRouter.close).toHaveBeenCalled();
      }
    });

    test("should handle concurrent execution appropriately", async () => {
      mockSourcesRepository.getProjectFilesCount.mockResolvedValue(0);
      mockCodebaseToDbLoader.loadIntoDB.mockImplementation(async () => {
        // Simulate some processing time
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // Execute multiple instances concurrently
      const promises = [codebaseCaptureTask.execute(), codebaseCaptureTask.execute()];

      await Promise.all(promises);

      // Each execution should have called the dependencies
      expect(mockSourcesRepository.getProjectFilesCount).toHaveBeenCalledTimes(2);
      expect(mockLLMRouter.close).toHaveBeenCalledTimes(2);
    });
  });
});

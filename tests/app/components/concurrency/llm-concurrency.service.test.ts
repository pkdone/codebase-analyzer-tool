import "reflect-metadata";
import { LlmConcurrencyService } from "../../../../src/app/components/concurrency/llm-concurrency.service";
import type { ConcurrencyConfigType } from "../../../../src/app/config/concurrency.config";

describe("LlmConcurrencyService", () => {
  describe("constructor", () => {
    it("should create service with provided concurrency limit", () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 5 };
      const service = new LlmConcurrencyService(config);

      expect(service).toBeDefined();
    });
  });

  describe("run", () => {
    it("should execute a single function successfully", async () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 5 };
      const service = new LlmConcurrencyService(config);

      const result = await service.run(async () => {
        return "test-result";
      });

      expect(result).toBe("test-result");
    });

    it("should propagate errors from the executed function", async () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 5 };
      const service = new LlmConcurrencyService(config);

      await expect(
        service.run(async () => {
          throw new Error("test-error");
        }),
      ).rejects.toThrow("test-error");
    });

    it("should limit concurrent executions", async () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 2 };
      const service = new LlmConcurrencyService(config);

      let maxConcurrent = 0;
      let currentConcurrent = 0;

      const createTask = async () =>
        service.run(async () => {
          currentConcurrent++;
          maxConcurrent = Math.max(maxConcurrent, currentConcurrent);
          // Small delay to allow concurrent tasks to start
          await new Promise((resolve) => setTimeout(resolve, 10));
          currentConcurrent--;
          return "done";
        });

      // Start 5 tasks with concurrency limit of 2
      const tasks = [createTask(), createTask(), createTask(), createTask(), createTask()];

      await Promise.all(tasks);

      // Maximum concurrent executions should not exceed the limit
      expect(maxConcurrent).toBeLessThanOrEqual(2);
    });

    it("should execute all tasks eventually", async () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 2 };
      const service = new LlmConcurrencyService(config);

      const results: number[] = [];

      const createTask = async (id: number) =>
        service.run(async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          results.push(id);
          return id;
        });

      // Start 5 tasks
      const returnValues = await Promise.all([
        createTask(1),
        createTask(2),
        createTask(3),
        createTask(4),
        createTask(5),
      ]);

      // All tasks should complete
      expect(results).toHaveLength(5);
      expect(returnValues).toEqual([1, 2, 3, 4, 5]);
    });
  });
});

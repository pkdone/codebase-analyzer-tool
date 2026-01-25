import "reflect-metadata";
import { LlmConcurrencyService } from "../../../../src/app/components/concurrency/llm-concurrency.service";
import type { ConcurrencyConfigType } from "../../../../src/app/config/concurrency.config";

describe("LlmConcurrencyService", () => {
  describe("constructor", () => {
    it("should create service with provided concurrency limit", () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 5 };
      const service = new LlmConcurrencyService(config);

      expect(service).toBeDefined();
      expect(service.pendingCount).toBe(0);
      expect(service.activeCount).toBe(0);
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

  describe("pendingCount", () => {
    it("should return 0 when no tasks are pending", () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 5 };
      const service = new LlmConcurrencyService(config);

      expect(service.pendingCount).toBe(0);
    });

    it("should track pending tasks", async () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 1 };
      const service = new LlmConcurrencyService(config);

      // Create a promise that we can control when to resolve
      let resolveFirst: () => void;
      const firstTask = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      // Start first task (will be active)
      const task1 = service.run(async () => firstTask);

      // Give time for the first task to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Start second task (will be pending since concurrency is 1)
      const task2Promise = service.run(async () => "second");

      // Give time for the second task to queue
      await new Promise((resolve) => setTimeout(resolve, 0));

      // With concurrency of 1, one task should be active and one pending
      expect(service.pendingCount).toBe(1);

      // Resolve the first task
      resolveFirst!();
      await task1;
      await task2Promise;

      expect(service.pendingCount).toBe(0);
    });
  });

  describe("activeCount", () => {
    it("should return 0 when no tasks are active", () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 5 };
      const service = new LlmConcurrencyService(config);

      expect(service.activeCount).toBe(0);
    });

    it("should track active tasks", async () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 5 };
      const service = new LlmConcurrencyService(config);

      let resolveTask: () => void;
      const taskPromise = new Promise<void>((resolve) => {
        resolveTask = resolve;
      });

      const runPromise = service.run(async () => taskPromise);

      // Give time for the task to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.activeCount).toBe(1);

      resolveTask!();
      await runPromise;

      expect(service.activeCount).toBe(0);
    });
  });

  describe("clearQueue", () => {
    it("should clear pending tasks from the queue", async () => {
      const config: ConcurrencyConfigType = { MAX_LLM_CONCURRENCY: 1 };
      const service = new LlmConcurrencyService(config);

      // Create a blocking task
      let resolveFirst: () => void;
      const firstTask = new Promise<void>((resolve) => {
        resolveFirst = resolve;
      });

      // Start first task (will be active)
      const task1 = service.run(async () => firstTask);

      // Give time for the first task to start
      await new Promise((resolve) => setTimeout(resolve, 0));

      // Queue more tasks
      void service.run(async () => "second");
      void service.run(async () => "third");

      // Give time for tasks to queue
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(service.pendingCount).toBe(2);

      // Clear the queue
      service.clearQueue();

      expect(service.pendingCount).toBe(0);

      // Clean up
      resolveFirst!();
      await task1;
    });
  });
});

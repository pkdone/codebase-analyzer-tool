import "reflect-metadata";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  ShutdownOrchestrator,
  createShutdownOrchestrator,
} from "../../../src/app/lifecycle/shutdown-orchestrator";
import type { MongoDBConnectionManager } from "../../../src/common/mongodb/mdb-connection-manager";
import type LLMRouter from "../../../src/common/llm/llm-router";
import { container } from "tsyringe";
import { coreTokens, llmTokens } from "../../../src/app/di/tokens";

describe("ShutdownOrchestrator", () => {
  let mockMongoConnectionManager: jest.Mocked<MongoDBConnectionManager>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockMongoConnectionManager = {
      shutdown: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<MongoDBConnectionManager>;

    mockLLMRouter = {
      shutdown: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
      getProvidersRequiringProcessExit: jest.fn<() => string[]>().mockReturnValue([]),
    } as unknown as jest.Mocked<LLMRouter>;
  });

  describe("shutdown", () => {
    it("should shutdown MongoDB and LLM router when both are present", async () => {
      const orchestrator = new ShutdownOrchestrator(mockMongoConnectionManager, mockLLMRouter);

      const result = await orchestrator.shutdown();

      expect(mockMongoConnectionManager.shutdown).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.shutdown).toHaveBeenCalledTimes(1);
      expect(result.requiresForcedExit).toBe(false);
      expect(result.providersRequiringExit).toEqual([]);
    });

    it("should handle case when only MongoDB is present", async () => {
      const orchestrator = new ShutdownOrchestrator(mockMongoConnectionManager, null);

      const result = await orchestrator.shutdown();

      expect(mockMongoConnectionManager.shutdown).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.shutdown).not.toHaveBeenCalled();
      expect(result.requiresForcedExit).toBe(false);
    });

    it("should handle case when only LLM router is present", async () => {
      const orchestrator = new ShutdownOrchestrator(null, mockLLMRouter);

      const result = await orchestrator.shutdown();

      expect(mockMongoConnectionManager.shutdown).not.toHaveBeenCalled();
      expect(mockLLMRouter.shutdown).toHaveBeenCalledTimes(1);
      expect(result.requiresForcedExit).toBe(false);
    });

    it("should handle case when neither dependency is present", async () => {
      const orchestrator = new ShutdownOrchestrator(null, null);

      const result = await orchestrator.shutdown();

      expect(result.requiresForcedExit).toBe(false);
      expect(result.providersRequiringExit).toEqual([]);
    });

    it("should return providers requiring exit when LLM router reports them", async () => {
      mockLLMRouter.getProvidersRequiringProcessExit.mockReturnValue(["VertexAI", "GoogleCloud"]);

      const orchestrator = new ShutdownOrchestrator(mockMongoConnectionManager, mockLLMRouter);

      const result = await orchestrator.shutdown();

      expect(result.requiresForcedExit).toBe(true);
      expect(result.providersRequiringExit).toEqual(["VertexAI", "GoogleCloud"]);
    });

    it("should shutdown MongoDB before LLM router", async () => {
      const callOrder: string[] = [];

      mockMongoConnectionManager.shutdown.mockImplementation(async () => {
        callOrder.push("mongodb");
      });

      mockLLMRouter.shutdown.mockImplementation(async () => {
        callOrder.push("llm");
      });

      const orchestrator = new ShutdownOrchestrator(mockMongoConnectionManager, mockLLMRouter);

      await orchestrator.shutdown();

      expect(callOrder).toEqual(["mongodb", "llm"]);
    });
  });

  describe("createShutdownOrchestrator", () => {
    let testContainer: typeof container;

    beforeEach(() => {
      testContainer = container.createChildContainer();
    });

    afterEach(() => {
      testContainer.reset();
    });

    it("should create orchestrator with both dependencies when registered", () => {
      testContainer.register(coreTokens.MongoDBConnectionManager, {
        useValue: mockMongoConnectionManager,
      });
      testContainer.register(llmTokens.LLMRouter, {
        useValue: mockLLMRouter,
      });

      const orchestrator = createShutdownOrchestrator(testContainer);

      expect(orchestrator).toBeInstanceOf(ShutdownOrchestrator);
    });

    it("should create orchestrator without MongoDB when not registered", () => {
      testContainer.register(llmTokens.LLMRouter, {
        useValue: mockLLMRouter,
      });

      const orchestrator = createShutdownOrchestrator(testContainer);

      expect(orchestrator).toBeInstanceOf(ShutdownOrchestrator);
    });

    it("should create orchestrator without LLM router when not registered", () => {
      testContainer.register(coreTokens.MongoDBConnectionManager, {
        useValue: mockMongoConnectionManager,
      });

      const orchestrator = createShutdownOrchestrator(testContainer);

      expect(orchestrator).toBeInstanceOf(ShutdownOrchestrator);
    });

    it("should create orchestrator with no dependencies when neither registered", () => {
      const orchestrator = createShutdownOrchestrator(testContainer);

      expect(orchestrator).toBeInstanceOf(ShutdownOrchestrator);
    });
  });
});

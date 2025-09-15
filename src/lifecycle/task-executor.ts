import "reflect-metadata";
import { Task } from "../tasks/task.types";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { ShutdownService } from "./shutdown-service";
import LLMRouter from "../llm/core/llm-router";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";

/**
 * Generic task runner function that handles task execution:
 * 1. Resolve and execute task using DI container (task dependencies are injected automatically)
 * 2. Handle graceful shutdown for any registered services that need cleanup
 *
 * Note: This function assumes the DI container has already been bootstrapped with async factories.
 * Use bootstrapContainer() before calling this function.
 */
export async function runTask(taskToken: symbol): Promise<void> {
  try {
    console.log(`START: ${new Date().toISOString()}`);

    // Resolve task (await handles both sync and async resolution)
    // Task dependencies are automatically injected via constructor DI
    const task = await container.resolve<Task | Promise<Task>>(taskToken);

    try {
      await task.execute();
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message.includes("execute")) {
        throw new Error(
          `Task for token '${taskToken.toString()}' could not be resolved or does not have a valid execute method.`,
        );
      }
      throw error;
    }
  } finally {
    console.log(`END: ${new Date().toISOString()}`);

    // Resolve shutdown dependencies safely and create shutdown service
    let llmRouter: LLMRouter | undefined;
    let mongoDBClientFactory: MongoDBClientFactory | undefined;

    if (container.isRegistered(TOKENS.LLMRouter)) {
      try {
        llmRouter = container.resolve<LLMRouter>(TOKENS.LLMRouter);
      } catch (error) {
        console.error("Failed to resolve LLMRouter for shutdown:", error);
      }
    }

    if (container.isRegistered(TOKENS.MongoDBClientFactory)) {
      try {
        mongoDBClientFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
      } catch (error) {
        console.error("Failed to resolve MongoDBClientFactory for shutdown:", error);
      }
    }

    try {
      const shutdownService = new ShutdownService(llmRouter, mongoDBClientFactory);
      await shutdownService.shutdownWithForcedExitFallback();
    } catch (error) {
      console.error("Failed to perform graceful shutdown:", error);
    }
  }
}

import "reflect-metadata";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";
import { gracefulShutdown } from "./shutdown";
import LLMRouter from "../llm/core/llm-router";
import { Task } from "./task.types";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { getTaskConfiguration } from "../di/registration-modules/task-config-registration";

/**
 * Generic task runner function that handles task execution:
 * 1. Resolve task configuration from DI container based on task token
 * 2. Resolve required resources from the pre-bootstrapped DI container (async factories handle initialization)
 * 3. Create and execute task using DI container
 * 4. Handle graceful shutdown
 *
 * Note: This function assumes the DI container has already been bootstrapped with async factories.
 * Use bootstrapContainer() before calling this function.
 */
export async function runTask(taskToken: symbol): Promise<void> {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;

  try {
    console.log(`START: ${new Date().toISOString()}`);
    const config = getTaskConfiguration(taskToken);

    if (config.requiresMongoDB) {
      mongoDBClientFactory = container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory);
    }

    if (config.requiresLLM) {
      // Resolve LLMRouter - async factory dependencies are handled internally by tsyringe
      llmRouter = container.resolve<LLMRouter>(TOKENS.LLMRouter);
    }

    // Resolve task (await handles both sync and async resolution)
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
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

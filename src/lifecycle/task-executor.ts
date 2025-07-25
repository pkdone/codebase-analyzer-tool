import "reflect-metadata";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";
import { gracefulShutdown } from "./shutdown";
import LLMRouter from "../llm/core/llm-router";
import { Task } from "./task.types";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { getTaskConfiguration } from "../di/registration-modules/task-config-registration";
import { initializeAndRegisterLLMRouter } from "../di/registration-modules/llm-registration";

/**
 * Generic task runner function that handles task execution:
 * 1. Resolve task configuration from DI container based on task token
 * 2. Initialize and register LLMRouter if required (isolating async logic)
 * 3. Resolve required resources from the pre-bootstrapped DI container
 * 4. Create and execute task using DI container
 * 5. Handle graceful shutdown
 *
 * Note: This function assumes the DI container has already been bootstrapped.
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
      // Check if LLMRouter is already registered, otherwise initialize it
      if (container.isRegistered(TOKENS.LLMRouter)) {
        llmRouter = container.resolve<LLMRouter>(TOKENS.LLMRouter);
      } else {
        llmRouter = await initializeAndRegisterLLMRouter();
      }
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

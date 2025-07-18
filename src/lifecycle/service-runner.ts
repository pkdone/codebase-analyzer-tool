import "reflect-metadata";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";
import { gracefulShutdown } from "./shutdown";
import LLMRouter from "../llm/core/llm-router";
import { Service } from "./service.types";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { getServiceConfiguration } from "../di/registration-modules/service-config-registration";
import { initializeAndRegisterLLMRouter } from "../di/registration-modules/llm-registration";

/**
 * Generic service runner function that handles service execution:
 * 1. Resolve service configuration from DI container based on service token
 * 2. Initialize and register LLMRouter if required (isolating async logic)
 * 3. Resolve required resources from the pre-bootstrapped DI container
 * 4. Create and execute service using DI container
 * 5. Handle graceful shutdown
 *
 * Note: This function assumes the DI container has already been bootstrapped.
 * Use bootstrapContainer() before calling this function.
 */
export async function runService(serviceToken: symbol): Promise<void> {
  let mongoDBClientFactory: MongoDBClientFactory | undefined;
  let llmRouter: LLMRouter | undefined;

  try {
    console.log(`START: ${new Date().toISOString()}`);
    const config = getServiceConfiguration(serviceToken);

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

    // Resolve service (await handles both sync and async resolution)
    const service = await container.resolve<Service | Promise<Service>>(serviceToken);

    try {
      await service.execute();
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("execute")) {
        throw new Error(
          `Service for token '${serviceToken.toString()}' could not be resolved or does not have a valid execute method.`,
        );
      }
      throw error;
    }
  } finally {
    console.log(`END: ${new Date().toISOString()}`);
    await gracefulShutdown(llmRouter, mongoDBClientFactory);
  }
}

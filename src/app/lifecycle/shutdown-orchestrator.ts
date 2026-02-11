import { coreTokens, llmTokens } from "../di/tokens";
import type { MongoDBConnectionManager } from "../../common/mongodb/mdb-connection-manager";
import type LLMRouter from "../../common/llm/llm-router";

/**
 * Result of the shutdown process indicating what action is needed.
 */
export interface ShutdownResult {
  /** Whether the process needs to be forcefully exited */
  requiresForcedExit: boolean;
  /** Names of providers that require forced exit (empty if none) */
  providersRequiringExit: string[];
}

/**
 * Orchestrates graceful shutdown of application resources.
 *
 * Handles ordered cleanup of:
 * 1. MongoDB connections (via MongoDBConnectionManager)
 * 2. LLM providers (via LLMRouter)
 *
 * After shutdown, indicates whether a forced process exit is required
 * due to certain providers (e.g., VertexAI) that don't properly release
 * their connections.
 *
 * Note: This class is NOT injectable via DI. Instead, use the
 * createShutdownOrchestrator factory function which handles optional
 * dependencies gracefully.
 *
 * @see https://github.com/googleapis/nodejs-pubsub/issues/1190 for VertexAI issue
 */
export class ShutdownOrchestrator {
  constructor(
    private readonly mongoConnectionManager: MongoDBConnectionManager | null,
    private readonly llmRouter: LLMRouter | null,
  ) {}

  /**
   * Performs graceful shutdown of all registered services.
   *
   * @returns Result indicating whether forced process exit is required
   */
  async shutdown(): Promise<ShutdownResult> {
    // Shutdown MongoDB connections first
    if (this.mongoConnectionManager) {
      await this.mongoConnectionManager.shutdown();
    }

    // Shutdown LLM providers and check if any require forced exit
    let providersRequiringExit: string[] = [];

    if (this.llmRouter) {
      providersRequiringExit = this.llmRouter.getProvidersRequiringProcessExit();
      await this.llmRouter.shutdown();
    }

    return {
      requiresForcedExit: providersRequiringExit.length > 0,
      providersRequiringExit,
    };
  }
}

/**
 * Factory function to create a ShutdownOrchestrator from the DI container.
 * Handles cases where optional dependencies may not be registered.
 *
 * @param container - The tsyringe container
 * @returns ShutdownOrchestrator instance with available dependencies
 */
export function createShutdownOrchestrator(
  container: import("tsyringe").DependencyContainer,
): ShutdownOrchestrator {
  const mongoConnectionManager = container.isRegistered(coreTokens.MongoDBConnectionManager)
    ? container.resolve<MongoDBConnectionManager>(coreTokens.MongoDBConnectionManager)
    : null;

  const llmRouter = container.isRegistered(llmTokens.LLMRouter)
    ? container.resolve<LLMRouter>(llmTokens.LLMRouter)
    : null;

  return new ShutdownOrchestrator(mongoConnectionManager, llmRouter);
}

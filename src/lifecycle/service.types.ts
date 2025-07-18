/**
 * Base interface that all services must implement.
 */
export interface Service {
  /**
   * Execute the main functionality of the service.
   */
  execute(): Promise<void>;
}

/**
 * Configuration for the service runner.
 */
export interface ServiceRunnerConfig {
  /** Whether this service requires MongoDB client */
  requiresMongoDB: boolean;
  /** Whether this service requires LLM router */
  requiresLLM: boolean;
}

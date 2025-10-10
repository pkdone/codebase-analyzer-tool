/**
 * Interface for components that require cleanup during application shutdown.
 * Components implementing this interface can be registered with the ShutdownService
 * for automatic cleanup during graceful shutdown.
 */
export interface IShutdownable {
  /**
   * Perform cleanup operations for this component.
   * This method will be called during application shutdown.
   * @returns A promise that resolves when cleanup is complete.
   */
  shutdown(): Promise<void>;
}

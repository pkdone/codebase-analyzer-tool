import "reflect-metadata";
import { injectable } from "tsyringe";
import { IShutdownable } from "../common/interfaces/shutdownable.interface";

/**
 * Service responsible for coordinating graceful shutdown of application components.
 * Uses the IShutdownable interface to handle cleanup in a generic, extensible way.
 * Components can register themselves for cleanup by implementing IShutdownable.
 */
@injectable()
export class ShutdownService {
  private readonly shutdownables: IShutdownable[] = [];

  /**
   * Register a component for graceful shutdown.
   * Components implementing IShutdownable can register themselves to be cleaned up
   * during application shutdown.
   *
   * @param shutdownable - Component implementing IShutdownable interface
   */
  register(shutdownable: IShutdownable): void {
    this.shutdownables.push(shutdownable);
  }

  /**
   * Perform graceful shutdown of all registered services.
   * Calls shutdown() on each registered IShutdownable component and handles failures gracefully.
   */
  async gracefulShutdown(): Promise<void> {
    const shutdownPromises = this.shutdownables.map(async (s) => {
      await s.shutdown();
    });
    const results = await Promise.allSettled(shutdownPromises);

    for (const [index, result] of results.entries()) {
      if (result.status === "rejected") {
        console.error(
          `Shutdown operation failed for component ${index + 1}/${this.shutdownables.length}:`,
          result.reason,
        );
      }
    }
  }
}

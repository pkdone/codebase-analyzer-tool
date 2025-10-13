import "reflect-metadata";
import { injectable, injectAll } from "tsyringe";
import { IShutdownable } from "../common/interfaces/shutdownable.interface";
import { TOKENS } from "../tokens";

/**
 * Service responsible for coordinating graceful shutdown of application components.
 * Uses the IShutdownable interface to handle cleanup in a generic, extensible way.
 * Components are automatically injected via the DI container using multi-injection.
 */
@injectable()
export class ShutdownService {
  constructor(@injectAll(TOKENS.Shutdownable) private readonly shutdownables: IShutdownable[]) {}

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

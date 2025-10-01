import { container } from "tsyringe";
import type { constructor } from "tsyringe/dist/typings/types";

/**
 * Registration configuration for a single component.
 * Generic allows callers to express (optionally) the instance type.
 * Heterogeneous arrays are still supported because the function below
 * accepts the erased version (ComponentRegistration[]).
 */
interface ComponentRegistration<T = unknown> {
  token: symbol;
  implementation: constructor<T>;
}

/**
 * Helper function to register multiple components in the DI container.
 * This eliminates duplication across registration modules.
 *
 * @param components Array of component registrations
 * @param logMessage Message to log after successful registration
 */
export function registerComponents(components: ComponentRegistration[], logMessage: string): void {
  components.forEach(({ token, implementation }) => {
    container.registerSingleton(token, implementation);
  });

  console.log(logMessage);
}

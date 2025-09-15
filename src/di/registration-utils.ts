import { container } from "tsyringe";

/**
 * Registration configuration for a single component.
 */
interface ComponentRegistration {
  token: symbol;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  implementation: new (...args: any[]) => any;
}

/**
 * Helper function to register multiple components in the DI container.
 * This eliminates duplication across registration modules.
 * 
 * @param components Array of component registrations
 * @param logMessage Message to log after successful registration
 */
export function registerComponents(
  components: ComponentRegistration[],
  logMessage: string,
): void {
  components.forEach(({ token, implementation }) => {
    container.registerSingleton(token, implementation);
  });
  
  console.log(logMessage);
}

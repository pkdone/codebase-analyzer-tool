/**
 * Register querying-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - Code questioning and analysis
 * - Interactive codebase querying functionality
 *
 * All components are registered here since tsyringe uses lazy-loading.
 * Note: CodebaseQueryProcessor is now a function, so no registration needed.
 */
export function registerQueryingComponents(): void {
  console.log("Querying components registered");
}

import { container } from "tsyringe";
import { captureTokens } from "../tokens";

// Capture component imports
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";

/**
 * Register capture-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - File processing and summarization
 * - Codebase loading into database
 * - File handling configuration
 *
 * All components are registered here since tsyringe uses lazy-loading.
 */
export function registerCaptureComponents(): void {
  container.registerSingleton(captureTokens.CodebaseToDBLoader, CodebaseToDBLoader);
  console.log("Capture components registered");
}

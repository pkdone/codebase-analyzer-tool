/**
 * @deprecated This file has been reorganized. The runApplication function has been moved to
 * ../lifecycle/service-runner.ts to better reflect its role as a general-purpose lifecycle manager
 * rather than CLI-specific functionality.
 *
 * All CLI files have been updated to import directly from the new location.
 * This re-export is maintained for backwards compatibility.
 */
export { runApplication } from "../lifecycle/service-runner";

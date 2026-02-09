/**
 * Common instruction fragments used across multiple sources templates.
 *
 * The COMMON section provides generic, language-agnostic instructions that work across
 * all programming languages. Modern LLMs can infer language-specific details from the
 * code context, making these generic instructions effective for most use cases.
 */

import { INTEGRATION_MECHANISM_VALUES } from "../../../../schemas/schema-value.constants";

/**
 * Type for integration mechanism values that have mechanism descriptions.
 * These are the values that appear in prompt instructions.
 */
type DescribedMechanism = Extract<
  (typeof INTEGRATION_MECHANISM_VALUES)[number],
  "REST" | "GRAPHQL" | "SOAP" | "WEBSOCKET" | "GRPC" | "SSE" | "TRPC"
>;

/**
 * Creates a mechanism description string from an enum value.
 * This ensures type safety between the schema and prompt instructions.
 *
 * @param mechanism - The integration mechanism value from the schema
 * @returns A formatted mechanism description string for use in prompts
 */
function createMechanismDesc(mechanism: DescribedMechanism): string {
  return `(mechanism: '${mechanism}')`;
}

export const COMMON_FRAGMENTS = {
  PURPOSE: "A detailed definition of its purpose",
  IMPLEMENTATION: "A detailed definition of its implementation",
  DB_IN_DOCUMENTATION:
    "Look for database schemas, queries, or data models mentioned in the documentation",
  DB_IN_FILE: "Look for database operations, queries, or connections in the file",
} as const;

/**
 * Integration points instruction fragments.
 */
export const INTEGRATION_POINTS_FRAGMENTS = {
  INTRO:
    "A list of integration points this file defines or consumes – for each integration include: mechanism type, name, description, and relevant details. Look for:",
} as const;

/**
 * Scheduled jobs instruction fragments.
 */
export const SCHEDULED_JOBS_FRAGMENTS = {
  INTRO: "A list of scheduled jobs or batch processes defined in this file – for each job extract:",
  FIELDS: ` * jobName: The name of the job (from filename or job card/comments)
  * trigger: How/when the job is triggered (cron, scheduled, manual, event-driven)
  * purpose: Detailed description of what it does
  * inputResources: Array of inputs (files, datasets, DBs, APIs)
  * outputResources: Array of outputs (files, datasets, DBs, APIs)
  * dependencies: Array of other jobs/scripts/resources it depends on
  * - estimatedDuration: Expected runtime if mentioned`,
} as const;

/**
 * Base instruction fragments for entity identification.
 */
export const BASE_FRAGMENTS = {
  CLASS: [
    "The name of the main public class/interface of the file",
    "Its kind ('class' or 'interface')",
    "Its namespace (classpath)",
  ] as const,
  MODULE: [
    "The name of the primary public entity of the file (class, module, or main function)",
    "Its kind ('class', 'module', or enum; choose the dominant one)",
    "Its namespace (fully qualified module path)",
  ] as const,
} as const;

/**
 * Standard mechanism descriptions for integration points.
 * These are used across multiple language-specific fragments to ensure consistency.
 *
 * The descriptions are derived from INTEGRATION_MECHANISM_VALUES to ensure type safety.
 * If the enum values change in the schema, TypeScript will catch any mismatches.
 */
export const MECHANISM_DESCRIPTIONS = {
  REST: createMechanismDesc("REST"),
  GRAPHQL: createMechanismDesc("GRAPHQL"),
  SOAP: createMechanismDesc("SOAP"),
  WEBSOCKET: createMechanismDesc("WEBSOCKET"),
  GRPC: createMechanismDesc("GRPC"),
  SSE: createMechanismDesc("SSE"),
  TRPC: createMechanismDesc("TRPC"),
} as const;

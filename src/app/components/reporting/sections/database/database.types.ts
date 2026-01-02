import { procedureTriggerSchema } from "../../../../schemas/sources.schema";
import { COMPLEXITY_VALUES, COMPLEXITY_VALUES_SET } from "../../../../schemas/sources.enums";
import type { TypeOf } from "zod";

// Complexity type derived from the enum definition
export type Complexity = (typeof COMPLEXITY_VALUES)[number];

/**
 * Type guard to check if a value is a valid Complexity value
 */
export function isComplexityLevel(value: unknown): value is Complexity {
  return typeof value === "string" && COMPLEXITY_VALUES_SET.has(value.toUpperCase() as Complexity);
}

export type ProcedureTrigger = TypeOf<typeof procedureTriggerSchema>;

// Interface for the database interaction list
export interface ProcsAndTriggers {
  procs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: (ProcedureTrigger & { path: string; type: string; functionName: string } & Record<
        string,
        unknown
      >)[];
  };
  trigs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: (ProcedureTrigger & { path: string; type: string; functionName: string } & Record<
        string,
        unknown
      >)[];
  };
}

// Interface representing database integration information
export interface DatabaseIntegrationInfo extends Record<string, unknown> {
  readonly path: string;
  readonly mechanism: string;
  readonly name?: string;
  readonly description: string;
  readonly databaseName?: string;
  readonly tablesAccessed?: string[];
  readonly operationType?: string[];
  readonly queryPatterns?: string;
  readonly transactionHandling?: string;
  readonly protocol?: string;
  readonly connectionInfo?: string;
  readonly codeExample: string;
}

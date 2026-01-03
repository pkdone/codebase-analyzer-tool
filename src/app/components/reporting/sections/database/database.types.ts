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

/**
 * Shape of a single stored procedure or trigger item in the report list.
 * Extends ProcedureTrigger with report-specific fields and an index signature
 * for DisplayableTableRow compatibility.
 */
export type ProcsOrTrigsListItem = ProcedureTrigger & {
  path: string;
  type: string;
  functionName: string;
} & Record<string, unknown>;

// Interface for the database interaction list
export interface ProcsAndTriggers {
  procs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: ProcsOrTrigsListItem[];
  };
  trigs: {
    total: number;
    low: number;
    medium: number;
    high: number;
    list: ProcsOrTrigsListItem[];
  };
}

/**
 * Interface representing database integration information.
 * Contains details about how the application interacts with databases.
 *
 * The index signature enables compatibility with DisplayableTableRow for table rendering.
 */
export interface DatabaseIntegrationInfo extends Record<
  string,
  string | readonly string[] | undefined
> {
  readonly path: string;
  readonly mechanism: string;
  readonly name?: string;
  readonly description: string;
  readonly databaseName?: string;
  readonly tablesAccessed?: readonly string[];
  readonly operationType?: readonly string[];
  readonly queryPatterns?: string;
  readonly transactionHandling?: string;
  readonly protocol?: string;
  readonly connectionInfo?: string;
  readonly codeExample: string;
}

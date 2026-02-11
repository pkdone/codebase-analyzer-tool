import {
  procedureTriggerSchema,
  COMPLEXITY_VALUES_SET,
  type ComplexityValue,
} from "../../../../schemas/source-file.schema";
import type { TypeOf } from "zod";

/**
 * Type guard to check if a value is a valid Complexity value
 */
export function isComplexityLevel(value: unknown): value is ComplexityValue {
  return (
    typeof value === "string" && COMPLEXITY_VALUES_SET.has(value.toUpperCase() as ComplexityValue)
  );
}

export type ProcedureTrigger = TypeOf<typeof procedureTriggerSchema>;

/**
 * Shape of a single stored procedure or trigger item in the report list.
 * Extends ProcedureTrigger with report-specific fields.
 * All properties are explicitly defined, eliminating the need for an index signature.
 */
export interface ProcsOrTrigsListItem extends ProcedureTrigger {
  path: string;
  type: string;
  functionName: string;
}

/**
 * Complexity counts per level for a single object type category.
 */
export interface ComplexityCounts {
  total: number;
  low: number;
  medium: number;
  high: number;
}

/**
 * Aggregated stored procedures, functions, and triggers for the database report.
 * Each category tracks its own complexity breakdown.
 */
export interface ProcsAndTriggers {
  procedures: ComplexityCounts;
  functions: ComplexityCounts;
  triggers: ComplexityCounts;
  /** Combined flat list of all items for the card grid below the summary. */
  list: ProcsOrTrigsListItem[];
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

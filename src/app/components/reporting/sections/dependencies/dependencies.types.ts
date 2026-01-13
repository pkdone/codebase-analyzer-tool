/**
 * Types for the dependencies (Bill of Materials) report section.
 */

/**
 * Interface for BOM dependency information
 */
export interface BomDependency {
  readonly name: string;
  readonly groupId?: string;
  readonly versions: string[];
  readonly hasConflict: boolean;
  readonly scopes?: string[];
  readonly locations: string[];
}

/**
 * Interface for BOM statistics with pre-computed presentation values.
 * Used in HTML report rendering.
 */
export interface BomStatistics {
  /** Total number of dependencies */
  total: number;
  /** Number of dependencies with version conflicts */
  conflicts: number;
  /** Number of unique build files */
  buildFiles: number;
  /** Pre-computed CSS class for conflicts count display */
  conflictsCssClass: string;
}

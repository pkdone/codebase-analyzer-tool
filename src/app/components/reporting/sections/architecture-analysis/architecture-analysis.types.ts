/**
 * Types for the architecture analysis (module coupling) report section.
 */

/**
 * Interface for module coupling analysis information
 */
export interface ModuleCoupling {
  couplings: {
    fromModule: string;
    toModule: string;
    referenceCount: number;
    /** Pre-computed coupling level label (e.g., "Very High", "High", "Medium", "Low") */
    couplingLevel: string;
    /** Pre-computed CSS class for the coupling level badge */
    couplingLevelClass: string;
  }[];
  totalModules: number;
  totalCouplings: number;
  highestCouplingCount: number;
  moduleDepth: number;
}

/**
 * Interface for module coupling statistics used in HTML report rendering.
 */
export interface CouplingStatistics {
  /** Total number of unique modules */
  totalModules: number;
  /** Total number of coupling relationships */
  totalCouplings: number;
  /** Highest reference count between any two modules */
  highestCouplingCount: number;
  /** Module path depth used for analysis */
  moduleDepth: number;
}

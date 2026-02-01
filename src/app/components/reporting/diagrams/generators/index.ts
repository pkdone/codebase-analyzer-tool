/**
 * Diagram generators - public API
 *
 * Note: Domain-specific diagram generators have been moved to their respective section folders:
 * - DomainModelDiagramGenerator -> sections/domain-model/
 * - CurrentArchitectureDiagramGenerator -> sections/inferred-architecture/
 * - ArchitectureDiagramGenerator -> sections/future-architecture/
 *
 * This module now only exports shared/base generators.
 */
export { BaseDiagramGenerator } from "./base-diagram-generator";
export type { BaseDiagramOptions, DiagramInitDirectiveType } from "./base-diagram-generator";

export { FlowchartDiagramGenerator } from "./flowchart-diagram-generator";
export type {
  BusinessProcessActivity,
  BusinessProcess,
  FlowchartDiagramOptions,
} from "./flowchart-diagram-generator";

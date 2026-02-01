/**
 * Inferred architecture section - visualization of inferred architecture from the codebase.
 */

export { InferredArchitectureSection } from "./inferred-architecture-section";
export { extractInferredArchitectureData } from "./inferred-architecture-extractor";
export { CurrentArchitectureDiagramGenerator } from "./current-architecture-diagram-generator";
export type {
  InferredInternalComponent,
  InferredExternalDependency,
  InferredComponentDependency,
  InferredArchitectureData,
  CurrentArchitectureDiagramOptions,
} from "./current-architecture-diagram-generator";

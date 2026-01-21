import { injectable } from "tsyringe";
import { escapeMermaidLabel, generateNodeId, buildArrow, applyStyle } from "../utils";
import { BaseDiagramGenerator, type BaseDiagramOptions } from "./base-diagram-generator";
import { currentArchitectureConfig } from "../diagrams.config";

/**
 * Represents an internal business component inferred from the codebase.
 */
export interface InferredInternalComponent {
  name: string;
  description: string;
}

/**
 * Represents an external dependency (database, queue, API, etc.).
 */
export interface InferredExternalDependency {
  name: string;
  type: string;
  description: string;
}

/**
 * Represents a dependency relationship between components.
 */
export interface InferredComponentDependency {
  from: string;
  to: string;
  description: string;
}

/**
 * Complete inferred architecture data structure.
 */
export interface InferredArchitectureData {
  internalComponents: InferredInternalComponent[];
  externalDependencies: InferredExternalDependency[];
  dependencies: InferredComponentDependency[];
}

export type CurrentArchitectureDiagramOptions = BaseDiagramOptions;

/**
 * Generates Mermaid diagrams for the current/inferred architecture.
 * Creates component-style diagrams showing internal business components and
 * their relationships to external dependencies.
 * Extends BaseDiagramGenerator to share common functionality.
 *
 * Diagrams are rendered client-side using Mermaid.js.
 */
@injectable()
export class CurrentArchitectureDiagramGenerator extends BaseDiagramGenerator<CurrentArchitectureDiagramOptions> {
  protected readonly defaultOptions: Required<CurrentArchitectureDiagramOptions> = {
    width: currentArchitectureConfig.DEFAULT_WIDTH,
    height: currentArchitectureConfig.DEFAULT_HEIGHT,
  };

  /**
   * Generate diagram for the inferred/current architecture.
   * Returns HTML with embedded Mermaid definition for client-side rendering.
   */
  generateCurrentArchitectureDiagram(
    architectureData: InferredArchitectureData | null,
    options: CurrentArchitectureDiagramOptions = {},
  ): string {
    return this.generateDiagram(
      architectureData,
      options,
      (data) => !data || data.internalComponents.length === 0,
      "No inferred architecture data available",
      (data) => {
        if (!data) {
          throw new Error("Architecture data is null");
        }
        return this.buildCurrentArchitectureDiagramDefinition(data);
      },
    );
  }

  /**
   * Build the Mermaid diagram definition for current architecture.
   * Uses a flat layout without nested subgraphs to avoid overlap issues.
   */
  private buildCurrentArchitectureDiagramDefinition(
    architectureData: InferredArchitectureData,
  ): string {
    // Use TB layout with increased padding for better spacing
    const lines = this.initializeDiagram("flowchart TB", "architecture");

    // Build a map of component names to node IDs for dependency resolution
    const nodeIdMap = new Map<string, string>();

    // Create internal component nodes (no subgraph to avoid nesting issues)
    architectureData.internalComponents.forEach((component, index) => {
      const nodeId = generateNodeId(`int_${component.name}`, index);
      nodeIdMap.set(component.name, nodeId);
      lines.push(`    ${nodeId}["${escapeMermaidLabel(component.name)}"]`);
    });

    // Create external dependency nodes
    architectureData.externalDependencies.forEach((dep, index) => {
      const nodeId = generateNodeId(`ext_${dep.name}`, index);
      nodeIdMap.set(dep.name, nodeId);
      const escapedName = escapeMermaidLabel(dep.name);
      const escapedType = escapeMermaidLabel(dep.type);
      lines.push(`    ${nodeId}["${escapedName}<br/><i>${escapedType}</i>"]`);
    });

    // Add dependency arrows
    architectureData.dependencies.forEach((dep) => {
      const fromId = nodeIdMap.get(dep.from);
      const toId = nodeIdMap.get(dep.to);
      if (fromId && toId) {
        lines.push(buildArrow(fromId, toId));
      }
    });

    // Apply styles to internal component nodes
    architectureData.internalComponents.forEach((component, index) => {
      const nodeId = generateNodeId(`int_${component.name}`, index);
      lines.push(applyStyle(nodeId, "internalComponent"));
    });

    // Apply styles to external dependency nodes
    architectureData.externalDependencies.forEach((dep, index) => {
      const nodeId = generateNodeId(`ext_${dep.name}`, index);
      lines.push(applyStyle(nodeId, "externalComponent"));
    });

    return lines.join("\n");
  }
}

import { inject, injectable } from "tsyringe";
import { reportingTokens } from "../../../../di/tokens";
import type { MermaidRenderer } from "../mermaid/mermaid-renderer";
import {
  escapeMermaidLabel,
  generateNodeId,
  buildArrow,
} from "../mermaid/mermaid-definition-builders";
import { buildStyleDefinitions, applyStyle } from "../mermaid/mermaid-styles.config";
import { BaseMermaidGenerator, type BaseDiagramOptions } from "./base-mermaid-generator";
import { visualizationConfig } from "../visualization.config";

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

export type CurrentArchitectureDiagramSvgOptions = BaseDiagramOptions;

/**
 * Generates SVG diagrams for the current/inferred architecture using Mermaid.
 * Creates component-style diagrams showing internal business components and
 * their relationships to external dependencies.
 * Extends BaseMermaidGenerator to share common rendering functionality.
 */
@injectable()
export class CurrentArchitectureSvgGenerator extends BaseMermaidGenerator<CurrentArchitectureDiagramSvgOptions> {
  protected readonly defaultOptions: Required<CurrentArchitectureDiagramSvgOptions> = {
    width: visualizationConfig.currentArchitecture.DEFAULT_WIDTH,
    height: visualizationConfig.currentArchitecture.DEFAULT_HEIGHT,
  };

  constructor(
    @inject(reportingTokens.MermaidRenderer)
    mermaidRenderer: MermaidRenderer,
  ) {
    super(mermaidRenderer);
  }

  /**
   * Generate SVG diagram for the inferred/current architecture.
   */
  async generateCurrentArchitectureDiagramSvg(
    architectureData: InferredArchitectureData | null,
    options: CurrentArchitectureDiagramSvgOptions = {},
  ): Promise<string> {
    const opts = this.mergeOptions(options);

    if (!architectureData || architectureData.internalComponents.length === 0) {
      return this.generateEmptyDiagram("No inferred architecture data available");
    }

    // Build mermaid definition
    const mermaidDefinition = this.buildCurrentArchitectureDiagramDefinition(architectureData);

    const archConfig = visualizationConfig.currentArchitecture;

    // Calculate dynamic dimensions based on content
    const internalCount = architectureData.internalComponents.length;
    const externalCount = architectureData.externalDependencies.length;
    const maxVerticalNodes = Math.max(internalCount, externalCount);
    const maxNameLength = Math.max(
      ...architectureData.internalComponents.map((c) => c.name.length),
      ...architectureData.externalDependencies.map((d) => d.name.length + d.type.length),
    );
    const nodeWidth = Math.max(
      archConfig.MIN_NODE_WIDTH,
      maxNameLength * archConfig.CHAR_WIDTH_MULTIPLIER,
    );

    // Width: space for 2 subgraphs side by side plus padding
    const { width } = this.calculateDimensions(2, {
      minWidth: opts.width,
      minHeight: 0,
      widthPerNode: nodeWidth + archConfig.WIDTH_PADDING,
    });
    // Height: based on number of vertical nodes
    const { height } = this.calculateDimensions(maxVerticalNodes, {
      minWidth: 0,
      minHeight: opts.height,
      heightPerNode: archConfig.HEIGHT_PER_NODE,
    });
    const dynamicHeight = height + archConfig.HEIGHT_PADDING; // Add padding for layout

    return this.renderDiagram(mermaidDefinition, width, dynamicHeight);
  }

  /**
   * Build the Mermaid diagram definition for current architecture.
   * Uses a flat layout without nested subgraphs to avoid overlap issues.
   */
  private buildCurrentArchitectureDiagramDefinition(
    architectureData: InferredArchitectureData,
  ): string {
    // Use TB layout with increased padding for better spacing
    const lines: string[] = [
      "%%{init: {'flowchart': {'diagramPadding': 50, 'nodeSpacing': 30, 'rankSpacing': 60}}}%%",
      "flowchart TB",
    ];

    // Add style definitions
    lines.push(buildStyleDefinitions());

    // Build a map of component names to node IDs for dependency resolution
    const nodeIdMap = new Map<string, string>();

    // Create internal component nodes (no subgraph to avoid nesting issues)
    const internalNodeIds: string[] = [];
    architectureData.internalComponents.forEach((component, index) => {
      const nodeId = generateNodeId(`int_${component.name}`, index);
      nodeIdMap.set(component.name, nodeId);
      internalNodeIds.push(nodeId);
      lines.push(`    ${nodeId}["${escapeMermaidLabel(component.name)}"]`);
    });

    // Create external dependency nodes
    const externalNodeIds: string[] = [];
    architectureData.externalDependencies.forEach((dep, index) => {
      const nodeId = generateNodeId(`ext_${dep.name}`, index);
      nodeIdMap.set(dep.name, nodeId);
      externalNodeIds.push(nodeId);
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

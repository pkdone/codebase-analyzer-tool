import { inject, injectable } from "tsyringe";
import { reportingTokens } from "../../../../di/tokens";
import { MermaidRenderer } from "../mermaid/mermaid-renderer";
import {
  escapeMermaidLabel,
  generateNodeId,
  buildStyleDefinitions,
  applyStyle,
} from "../mermaid/mermaid-definition-builders";
import type {
  DomainBoundedContext,
  DomainAggregate,
  DomainEntity,
} from "../../sections/visualizations/domain-model-data-provider";

export interface DomainDiagramSvgOptions {
  width?: number;
  height?: number;
}

/**
 * Generates SVG diagrams for domain models using Mermaid.
 * Creates hierarchical diagrams showing bounded contexts with their aggregates, entities, and repositories.
 */
@injectable()
export class DomainModelSvgGenerator {
  private readonly defaultOptions: Required<DomainDiagramSvgOptions> = {
    width: 1200,
    height: 600,
  };

  constructor(
    @inject(reportingTokens.MermaidRenderer)
    private readonly mermaidRenderer: MermaidRenderer,
  ) {}

  /**
   * Generate SVG diagram for a single bounded context
   */
  async generateContextDiagramSvg(
    context: DomainBoundedContext,
    options: DomainDiagramSvgOptions = {},
  ): Promise<string> {
    const opts = { ...this.defaultOptions, ...options };

    if (context.aggregates.length === 0 && context.entities.length === 0) {
      return this.generateEmptyDiagram("No domain model elements defined");
    }

    // Build mermaid definition
    const mermaidDefinition = this.buildContextDiagramDefinition(context);

    // Calculate dynamic dimensions based on content
    const nodeCount =
      context.aggregates.length + context.entities.length + context.repositories.length + 1;
    const dynamicWidth = Math.max(opts.width, nodeCount * 180);
    const dynamicHeight = Math.max(opts.height, 400);

    // Render to SVG using mermaid-cli
    const svg = await this.mermaidRenderer.renderToSvg(mermaidDefinition, {
      width: dynamicWidth,
      height: dynamicHeight,
      backgroundColor: "#f8f9fa",
    });

    return svg;
  }

  /**
   * Generate SVG diagrams for multiple bounded contexts
   */
  async generateMultipleContextDiagramsSvg(
    contexts: DomainBoundedContext[],
    options: DomainDiagramSvgOptions = {},
  ): Promise<string[]> {
    const results: string[] = [];
    for (const context of contexts) {
      const svg = await this.generateContextDiagramSvg(context, options);
      results.push(svg);
    }
    return results;
  }

  /**
   * Build the Mermaid diagram definition for a bounded context
   * Uses flowchart with subgraphs to position repository horizontally next to aggregate
   */
  private buildContextDiagramDefinition(context: DomainBoundedContext): string {
    const lines: string[] = ["flowchart TB"];

    // Add style definitions
    lines.push(buildStyleDefinitions());

    // Create context node at the top (hexagon shape with name only)
    const contextId = generateNodeId(context.name, 0);
    lines.push(`    ${contextId}{{"${escapeMermaidLabel(context.name)}"}}`);
    lines.push(applyStyle(contextId, "boundedContext"));

    // Track aggregate IDs for entity connections
    const aggregateIds = new Map<string, string>();

    // Create each aggregate with its repository in a horizontal subgraph
    context.aggregates.forEach((aggregate, index) => {
      const aggId = generateNodeId(`agg_${aggregate.name}`, index);
      const repoId = generateNodeId(`repo_${aggregate.repository.name}`, index);
      const subgraphId = `aggRepoGroup${index}`;

      aggregateIds.set(aggregate.name, aggId);

      // Create a subgraph with LR direction to place repo to the right of aggregate
      lines.push(`    subgraph ${subgraphId}[" "]`);
      lines.push(`        direction LR`);
      lines.push(`        ${aggId}(["${escapeMermaidLabel(aggregate.name)}"])`);
      lines.push(`        ${repoId}(("${escapeMermaidLabel(aggregate.repository.name)}"))`);
      lines.push(`        ${aggId} -.- ${repoId}`);
      lines.push(`    end`);

      // Style the subgraph to be invisible (no border, transparent background)
      lines.push(`    style ${subgraphId} fill:transparent,stroke:transparent,stroke-width:0`);

      // Apply node styles
      lines.push(applyStyle(aggId, "aggregate"));
      lines.push(applyStyle(repoId, "repository"));

      // Connect context to the aggregate
      lines.push(`    ${contextId} --> ${aggId}`);
    });

    // Create entity nodes in a separate subgraph below
    if (context.entities.length > 0) {
      lines.push(`    subgraph entitiesGroup[" "]`);
      lines.push(`        direction LR`);

      context.entities.forEach((entity, index) => {
        const entityId = generateNodeId(`entity_${entity.name}`, index);
        lines.push(`        ${entityId}("${escapeMermaidLabel(entity.name)}")`);
      });

      lines.push(`    end`);
      lines.push(`    style entitiesGroup fill:transparent,stroke:transparent,stroke-width:0`);

      // Apply styles and create connections to entities
      context.entities.forEach((entity, index) => {
        const entityId = generateNodeId(`entity_${entity.name}`, index);
        lines.push(applyStyle(entityId, "entity"));

        // Find which aggregate this entity belongs to and connect to it
        const connectedAggId = this.findEntityAggregate(entity, context.aggregates, aggregateIds);
        if (connectedAggId) {
          lines.push(`    ${connectedAggId} -.-> ${entityId}`);
        } else if (aggregateIds.size > 0) {
          // Connect to first aggregate as fallback
          const firstAggId = aggregateIds.values().next().value;
          if (firstAggId) {
            lines.push(`    ${firstAggId} -.-> ${entityId}`);
          }
        }
      });
    }

    return lines.join("\n");
  }

  /**
   * Find the aggregate that an entity belongs to
   */
  private findEntityAggregate(
    entity: DomainEntity,
    aggregates: DomainAggregate[],
    aggregateIds: Map<string, string>,
  ): string | undefined {
    for (const aggregate of aggregates) {
      if (aggregate.entities.includes(entity.name)) {
        return aggregateIds.get(aggregate.name);
      }
    }
    return undefined;
  }

  /**
   * Generate an empty diagram placeholder
   */
  private generateEmptyDiagram(message: string): string {
    return `<svg width="400" height="100" xmlns="http://www.w3.org/2000/svg" style="background-color: #f8f9fa; border-radius: 8px;">
      <text x="200" y="50" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#8b95a1">${message}</text>
    </svg>`;
  }
}

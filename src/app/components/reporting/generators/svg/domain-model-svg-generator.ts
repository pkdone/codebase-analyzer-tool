import { inject, injectable } from "tsyringe";
import { reportingTokens } from "../../../../di/tokens";
import type { MermaidRenderer } from "../mermaid/mermaid-renderer";
import {
  escapeMermaidLabel,
  generateNodeId,
  buildMermaidInitDirective,
} from "../mermaid/mermaid-definition-builders";
import { buildStyleDefinitions, applyStyle } from "../mermaid/mermaid-styles.config";
import type {
  DomainBoundedContext,
  DomainAggregate,
  DomainEntity,
} from "../../sections/visualizations/domain-model-data-provider";
import { BaseMermaidGenerator, type BaseDiagramOptions } from "./base-mermaid-generator";
import { visualizationConfig } from "../visualization.config";

export type DomainDiagramSvgOptions = BaseDiagramOptions;

/**
 * Generates SVG diagrams for domain models using Mermaid.
 * Creates hierarchical diagrams showing bounded contexts with their aggregates, entities, and repositories.
 * Extends BaseMermaidGenerator to share common rendering functionality.
 */
@injectable()
export class DomainModelSvgGenerator extends BaseMermaidGenerator<DomainDiagramSvgOptions> {
  protected readonly defaultOptions: Required<DomainDiagramSvgOptions> = {
    width: visualizationConfig.domainModel.DEFAULT_WIDTH,
    height: visualizationConfig.domainModel.DEFAULT_HEIGHT,
  };

  constructor(
    @inject(reportingTokens.MermaidRenderer)
    mermaidRenderer: MermaidRenderer,
  ) {
    super(mermaidRenderer);
  }

  /**
   * Generate SVG diagram for a single bounded context
   */
  async generateContextDiagramSvg(
    context: DomainBoundedContext,
    options: DomainDiagramSvgOptions = {},
  ): Promise<string> {
    const opts = this.mergeOptions(options);

    if (context.aggregates.length === 0 && context.entities.length === 0) {
      return this.generateEmptyDiagram("No domain model elements defined");
    }

    const domainConfig = visualizationConfig.domainModel;

    // Build mermaid definition
    const mermaidDefinition = this.buildContextDiagramDefinition(context);

    // Calculate dynamic dimensions based on content
    const nodeCount =
      context.aggregates.length + context.entities.length + context.repositories.length + 1;
    const { width, height } = this.calculateDimensions(nodeCount, {
      minWidth: opts.width,
      minHeight: domainConfig.MIN_HEIGHT,
      widthPerNode: domainConfig.WIDTH_PER_NODE,
    });

    return this.renderDiagram(mermaidDefinition, width, height);
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
    const lines: string[] = [buildMermaidInitDirective(), "flowchart TB"];

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
}

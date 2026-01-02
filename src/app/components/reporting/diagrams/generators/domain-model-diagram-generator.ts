import { injectable } from "tsyringe";
import {
  escapeMermaidLabel,
  generateNodeId,
  buildMermaidInitDirective,
  buildStyleDefinitions,
  applyStyle,
} from "../utils";
import type {
  DomainBoundedContext,
  DomainAggregate,
  DomainEntity,
} from "../../sections/visualizations/domain-model-data-provider";
import { BaseDiagramGenerator, type BaseDiagramOptions } from "./base-diagram-generator";
import { visualizationConfig } from "../../generators/visualization.config";

export type DomainDiagramOptions = BaseDiagramOptions;

/**
 * Generates Mermaid diagrams for domain models.
 * Creates hierarchical diagrams showing bounded contexts with their aggregates, entities, and repositories.
 * Extends BaseDiagramGenerator to share common functionality.
 *
 * Diagrams are rendered client-side using Mermaid.js.
 */
@injectable()
export class DomainModelDiagramGenerator extends BaseDiagramGenerator<DomainDiagramOptions> {
  protected readonly defaultOptions: Required<DomainDiagramOptions> = {
    width: visualizationConfig.domainModel.DEFAULT_WIDTH,
    height: visualizationConfig.domainModel.DEFAULT_HEIGHT,
  };

  /**
   * Generate diagram for a single bounded context.
   * Returns HTML with embedded Mermaid definition for client-side rendering.
   */
  generateContextDiagram(
    context: DomainBoundedContext,
    options: DomainDiagramOptions = {},
  ): string {
    this.mergeOptions(options);

    if (context.aggregates.length === 0 && context.entities.length === 0) {
      return this.generateEmptyDiagram("No domain model elements defined");
    }

    // Build mermaid definition
    const mermaidDefinition = this.buildContextDiagramDefinition(context);

    return this.wrapForClientRendering(mermaidDefinition);
  }

  /**
   * Generate diagrams for multiple bounded contexts.
   * Returns array of HTML strings with embedded Mermaid definitions.
   */
  generateMultipleContextDiagrams(
    contexts: DomainBoundedContext[],
    options: DomainDiagramOptions = {},
  ): string[] {
    return contexts.map((context) => this.generateContextDiagram(context, options));
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

import { injectable } from "tsyringe";
import { generateNodeId } from "../utils";
import type {
  DomainBoundedContext,
  DomainAggregate,
  DomainEntity,
} from "../../sections/visualizations/domain-model-data-provider";
import { BaseDiagramGenerator, type BaseDiagramOptions } from "./base-diagram-generator";
import { domainModelConfig } from "./domain-model.config";
import { MermaidFlowchartBuilder } from "../builders";

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
    width: domainModelConfig.DEFAULT_WIDTH,
    height: domainModelConfig.DEFAULT_HEIGHT,
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

    // Build mermaid definition using the fluent builder
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
   * using the type-safe MermaidFlowchartBuilder.
   */
  private buildContextDiagramDefinition(context: DomainBoundedContext): string {
    const builder = new MermaidFlowchartBuilder("TB");

    // Create context node at the top (hexagon shape with name only)
    const contextId = generateNodeId(context.name, 0);
    builder.addNode(contextId, context.name, "hexagon");
    builder.applyStyle(contextId, "boundedContext");

    // Track aggregate IDs for entity connections
    const aggregateIds = new Map<string, string>();

    // Create each aggregate with its repository in a horizontal subgraph
    context.aggregates.forEach((aggregate, index) => {
      const aggId = generateNodeId(`agg_${aggregate.name}`, index);
      const repoId = generateNodeId(`repo_${aggregate.repository.name}`, index);
      const subgraphId = `aggRepoGroup${index}`;

      aggregateIds.set(aggregate.name, aggId);

      // Create a subgraph with LR direction to place repo to the right of aggregate
      builder.addSubgraph(
        subgraphId,
        " ",
        (sub) => {
          sub.addNode(aggId, aggregate.name, "stadium");
          sub.addNode(repoId, aggregate.repository.name, "circle");
          sub.addEdge(aggId, repoId, undefined, "dashed");
          sub.applyStyle(aggId, "aggregate");
          sub.applyStyle(repoId, "repository");
        },
        "LR",
      );

      // Style the subgraph to be invisible
      builder.styleSubgraph(subgraphId, "fill:transparent,stroke:transparent,stroke-width:0");

      // Connect context to the aggregate
      builder.addEdge(contextId, aggId);
    });

    // Create entity nodes in a separate subgraph below
    if (context.entities.length > 0) {
      builder.addSubgraph(
        "entitiesGroup",
        " ",
        (sub) => {
          context.entities.forEach((entity, index) => {
            const entityId = generateNodeId(`entity_${entity.name}`, index);
            sub.addNode(entityId, entity.name, "rounded");
            sub.applyStyle(entityId, "entity");
          });
        },
        "LR",
      );

      builder.styleSubgraph("entitiesGroup", "fill:transparent,stroke:transparent,stroke-width:0");

      // Create connections from aggregates to entities
      context.entities.forEach((entity, index) => {
        const entityId = generateNodeId(`entity_${entity.name}`, index);

        // Find which aggregate this entity belongs to and connect to it
        const connectedAggId = this.findEntityAggregate(entity, context.aggregates, aggregateIds);
        if (connectedAggId) {
          builder.addEdge(connectedAggId, entityId, undefined, "dotted");
        } else if (aggregateIds.size > 0) {
          // Connect to first aggregate as fallback
          const firstAggId = aggregateIds.values().next().value;
          if (firstAggId) {
            builder.addEdge(firstAggId, entityId, undefined, "dotted");
          }
        }
      });
    }

    return builder.render();
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

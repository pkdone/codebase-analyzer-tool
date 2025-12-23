import { injectable } from "tsyringe";
import {
  escapeXml,
  sanitizeId,
  wrapText,
  createSvgHeader,
  generateEmptyDiagram,
} from "./svg-utils";
import type {
  DomainBoundedContext,
  DomainAggregate,
  DomainEntity,
} from "../../sections/advanced-data/domain-model-data-provider";

export interface DomainDiagramSvgOptions {
  width?: number;
  height?: number;
  padding?: number;
  fontSize?: number;
  fontFamily?: string;
  nodeSpacing?: number;
}

/**
 * Generates SVG diagrams for domain models.
 * Creates graph-style diagrams showing bounded contexts with their aggregates, entities, and repositories.
 */
@injectable()
export class DomainModelSvgGenerator {
  private readonly defaultOptions: Required<DomainDiagramSvgOptions> = {
    width: 1600, // Further increased width to prevent side clipping
    height: 600,
    padding: 40,
    fontSize: 11,
    fontFamily: "system-ui, -apple-system, sans-serif",
    nodeSpacing: 220, // Further increased spacing to prevent touching and clipping
  };

  /**
   * Generate SVG diagram for a single bounded context
   */
  generateContextDiagramSvg(
    context: DomainBoundedContext,
    options: DomainDiagramSvgOptions = {},
  ): string {
    const opts = { ...this.defaultOptions, ...options };

    if (context.aggregates.length === 0 && context.entities.length === 0) {
      return generateEmptyDiagram(
        opts.width,
        opts.height,
        "No domain model elements defined",
        opts.fontFamily,
        opts.fontSize,
      );
    }

    // Calculate dynamic width based on content
    const requiredWidth = this.calculateRequiredWidth(context, opts);
    const levelSpacing = 80; // Increased spacing between levels
    const nodeHeight = 60; // Updated height for aggregates (was 50)
    const entityHeight = 50; // Updated height for entities (was 40)
    const repositoryHeight = 50; // Updated height for repositories (was 40)
    const topPadding = 40; // Top padding
    const bottomPadding = 20; // Increased bottom padding for proper visual spacing

    // Calculate height dynamically based on which levels exist
    let currentY = topPadding + nodeHeight / 2; // Start with context level

    // Add space for aggregates if they exist
    if (context.aggregates.length > 0) {
      currentY += levelSpacing + nodeHeight / 2;
    }

    // Add space for repositories if they exist
    if (context.repositories.length > 0) {
      currentY += levelSpacing + repositoryHeight / 2;
    }

    // Add space for entities if they exist
    if (context.entities.length > 0) {
      currentY += levelSpacing + entityHeight / 2;
    }

    // Calculate total height based on the last level
    const totalHeight = currentY + entityHeight / 2 + bottomPadding;

    // Generate SVG content
    const svgContent = this.buildContextDiagramSvg(context, requiredWidth, totalHeight, opts);

    return svgContent;
  }

  /**
   * Generate SVG diagrams for multiple bounded contexts
   */
  generateMultipleContextDiagramsSvg(
    contexts: DomainBoundedContext[],
    options: DomainDiagramSvgOptions = {},
  ): string[] {
    return contexts.map((context) => this.generateContextDiagramSvg(context, options));
  }

  /**
   * Calculate required width based on content with multiple strategies
   */
  private calculateRequiredWidth(
    context: DomainBoundedContext,
    options: Required<DomainDiagramSvgOptions>,
  ): number {
    const minWidth = 1000; // Increased minimum width
    const maxWidth = 3000; // Increased maximum width for very busy diagrams
    const padding = 60; // Increased padding for safety

    // Strategy 1: Calculate based on actual entity count with generous spacing
    const entityCount = Math.max(context.entities.length, 1);
    const entitySpacing = Math.max(options.nodeSpacing, 250); // Ensure minimum spacing
    const entityWidth = 120; // Increased entity width estimate

    // Strategy 2: Calculate based on aggregates
    const aggregateCount = Math.max(context.aggregates.length, 1);
    const aggregateSpacing = Math.max(options.nodeSpacing, 250);
    const aggregateWidth = 140; // Increased aggregate width estimate

    // Strategy 3: Calculate based on repositories
    const repositoryCount = Math.max(context.repositories.length, 1);
    const repositorySpacing = Math.max(options.nodeSpacing, 250);
    const repositoryWidth = 200; // Increased repository width estimate

    // Calculate width for each level with generous estimates
    const entitiesWidth = (entityCount - 1) * entitySpacing + entityWidth;
    const aggregatesWidth = (aggregateCount - 1) * aggregateSpacing + aggregateWidth;
    const repositoriesWidth = (repositoryCount - 1) * repositorySpacing + repositoryWidth;

    // Use the widest level as the basis
    const maxLevelWidth = Math.max(entitiesWidth, aggregatesWidth, repositoriesWidth);

    // Add extra safety margin for very busy diagrams
    const safetyMargin = entityCount > 7 ? 400 : 200; // Extra margin for busy diagrams
    const requiredWidth = Math.max(
      minWidth,
      Math.min(maxWidth, maxLevelWidth + padding * 2 + safetyMargin),
    );

    console.log(
      `Calculating width for ${context.name}: ${entityCount} entities, ${aggregateCount} aggregates, ${repositoryCount} repositories`,
    );
    console.log(`Entity width: ${entitiesWidth}, Required width: ${requiredWidth}`);

    return requiredWidth;
  }

  /**
   * Build the complete SVG markup for a context diagram
   */
  private buildContextDiagramSvg(
    context: DomainBoundedContext,
    width: number,
    height: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string {
    const centerX = width / 2;
    const levelSpacing = 80;
    const nodeHeight = 50;
    const topPadding = 40;

    // Calculate positions dynamically based on which levels have content
    let currentY = topPadding + nodeHeight / 2;

    // Level 1: Bounded Context (always present)
    const contextY = currentY;
    const contextBox = this.createContextBox(context.name, centerX, contextY, options);
    currentY += levelSpacing + nodeHeight / 2;

    // Level 2: Aggregates (only if present)
    let aggregatesY = 0;
    let aggregates: string[] = [];
    if (context.aggregates.length > 0) {
      aggregatesY = currentY;
      aggregates = this.layoutAggregates(context.aggregates, centerX, aggregatesY, options);
      currentY += levelSpacing + nodeHeight / 2;
    }

    // Level 3: Repositories (only if present)
    let repositoriesY = 0;
    let repositories: string[] = [];
    if (context.repositories.length > 0) {
      repositoriesY = currentY;
      repositories = this.layoutRepositories(context.repositories, centerX, repositoriesY, options);
      currentY += levelSpacing + nodeHeight / 2;
    }

    // Level 4: Entities (only if present)
    let entitiesY = 0;
    let entities: string[] = [];
    if (context.entities.length > 0) {
      entitiesY = currentY;
      entities = this.layoutEntities(context.entities, centerX, entitiesY, options);
    }

    // Create hierarchical connections
    const connections = this.createHierarchicalConnections(
      context,
      centerX,
      contextY,
      aggregatesY,
      repositoriesY,
      entitiesY,
      options,
    );

    // Combine all SVG elements
    const svgElements = [
      createSvgHeader(width, height),
      ...connections,
      contextBox,
      ...aggregates,
      ...repositories,
      ...entities,
      "</svg>",
    ];

    return svgElements.join("\n");
  }

  /**
   * Create the main context box
   */
  private createContextBox(
    contextName: string,
    x: number,
    y: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string {
    const boxWidth = 200;
    const boxHeight = 80;
    const rectX = x - boxWidth / 2;
    const rectY = y - boxHeight / 2;

    return `
      <g id="context-${sanitizeId(contextName)}">
        <rect
          x="${rectX}"
          y="${rectY}"
          width="${boxWidth}"
          height="${boxHeight}"
          rx="12"
          ry="12"
          fill="#e8f5e8"
          stroke="#00684A"
          stroke-width="3"
        />
        <text
          x="${x}"
          y="${y + options.fontSize / 3}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize + 2}"
          font-weight="700"
          fill="#001e2b"
        >
          ${escapeXml(contextName)}
        </text>
        <text
          x="${x}"
          y="${y + 20}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize - 1}"
          font-weight="500"
          fill="#00684A"
        >
          Bounded Context
        </text>
      </g>`;
  }

  /**
   * Layout aggregates horizontally below the context
   */
  private layoutAggregates(
    aggregates: DomainAggregate[],
    centerX: number,
    startY: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string[] {
    const spacing = options.nodeSpacing;
    const startX = centerX - ((aggregates.length - 1) * spacing) / 2;

    return aggregates.map((aggregate, index) => {
      const x = startX + index * spacing;
      return this.createAggregateNode(aggregate, x, startY, options);
    });
  }

  /**
   * Layout entities below the context
   */
  private layoutEntities(
    entities: DomainEntity[],
    centerX: number,
    startY: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string[] {
    const spacing = options.nodeSpacing;
    const startX = centerX - ((entities.length - 1) * spacing) / 2;

    return entities.map((entity, index) => {
      const x = startX + index * spacing;
      return this.createEntityNode(entity, x, startY, options);
    });
  }

  /**
   * Layout repositories above the context
   */
  private layoutRepositories(
    repositories: DomainEntity[],
    centerX: number,
    startY: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string[] {
    const spacing = options.nodeSpacing;
    const startX = centerX - ((repositories.length - 1) * spacing) / 2;

    return repositories.map((repository, index) => {
      const x = startX + index * spacing;
      return this.createRepositoryNode(repository, x, startY, options);
    });
  }

  /**
   * Create an aggregate node
   */
  private createAggregateNode(
    _aggregate: DomainAggregate,
    x: number,
    y: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string {
    const nodeWidth = 120;
    const nodeHeight = 60; // Increased height for better spacing
    const rectX = x - nodeWidth / 2;
    const rectY = y - nodeHeight / 2;

    // Wrap text to fit within node width
    const wrappedText = wrapText(_aggregate.name, nodeWidth, options.fontSize);
    const lineHeight = options.fontSize * 1.2;
    const startY = y - 8; // Position main text higher

    return `
      <g id="aggregate-${sanitizeId(_aggregate.name)}">
        <rect
          x="${rectX}"
          y="${rectY}"
          width="${nodeWidth}"
          height="${nodeHeight}"
          rx="6"
          ry="6"
          fill="#e3f2fd"
          stroke="#1976d2"
          stroke-width="2"
        />
        ${wrappedText
          .map(
            (line, index) => `
        <text
          x="${x}"
          y="${startY + index * lineHeight}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize}"
          font-weight="600"
          fill="#001e2b"
        >
          ${escapeXml(line)}
        </text>`,
          )
          .join("")}
        <text
          x="${x}"
          y="${y + 15}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize - 2}"
          font-weight="500"
          fill="#1976d2"
        >
          Aggregate
        </text>
      </g>`;
  }

  /**
   * Create an entity node
   */
  private createEntityNode(
    _entity: DomainEntity,
    x: number,
    y: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string {
    const nodeWidth = 100;
    const nodeHeight = 50; // Increased height for better spacing
    const rectX = x - nodeWidth / 2;
    const rectY = y - nodeHeight / 2;

    // Wrap text to fit within node width
    const wrappedText = wrapText(_entity.name, nodeWidth, options.fontSize - 1);
    const lineHeight = (options.fontSize - 1) * 1.2;
    const startY = y - 8; // Position main text higher

    return `
      <g id="entity-${sanitizeId(_entity.name)}">
        <rect
          x="${rectX}"
          y="${rectY}"
          width="${nodeWidth}"
          height="${nodeHeight}"
          rx="20"
          ry="20"
          fill="#f3e5f5"
          stroke="#7b1fa2"
          stroke-width="1.5"
        />
        ${wrappedText
          .map((line, index) => {
            // Ensure consistent centering for all lines
            return `
        <text
          x="${x}"
          y="${startY + index * lineHeight}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize - 1}"
          font-weight="500"
          fill="#001e2b"
        >
          ${escapeXml(line)}
        </text>`;
          })
          .join("")}
        <text
          x="${x}"
          y="${y + 12}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize - 3}"
          font-weight="500"
          fill="#7b1fa2"
        >
          Entity
        </text>
      </g>`;
  }

  /**
   * Create a repository node
   */
  private createRepositoryNode(
    _repository: DomainEntity,
    x: number,
    y: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string {
    const nodeWidth = 180; // Further increased width for longer repository names
    const nodeHeight = 50; // Increased height for better spacing

    // Wrap text to fit within elliptical node (use smaller effective width)
    const effectiveWidth = nodeWidth * 0.7; // Further reduced for elliptical shape
    const wrappedText = wrapText(_repository.name, effectiveWidth, options.fontSize - 1);
    const lineHeight = (options.fontSize - 1) * 1.2;
    const startY = y - 8; // Position main text higher

    return `
      <g id="repository-${sanitizeId(_repository.name)}">
        <ellipse
          cx="${x}"
          cy="${y}"
          rx="${nodeWidth / 2}"
          ry="${nodeHeight / 2}"
          fill="#fff5f0"
          stroke="#d2691e"
          stroke-width="1.5"
        />
        ${wrappedText
          .map((line, index) => {
            // Ensure consistent centering for all lines
            return `
        <text
          x="${x}"
          y="${startY + index * lineHeight}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize - 1}"
          font-weight="500"
          fill="#001e2b"
        >
          ${escapeXml(line)}
        </text>`;
          })
          .join("")}
        <text
          x="${x}"
          y="${y + 12}"
          text-anchor="middle"
          font-family="${options.fontFamily}"
          font-size="${options.fontSize - 3}"
          font-weight="500"
          fill="#d2691e"
        >
          Repository
        </text>
      </g>`;
  }

  /**
   * Create hierarchical connections between levels
   */
  private createHierarchicalConnections(
    context: DomainBoundedContext,
    centerX: number,
    contextY: number,
    aggregatesY: number,
    repositoriesY: number,
    entitiesY: number,
    options: Required<DomainDiagramSvgOptions>,
  ): string[] {
    const connections: string[] = [];
    const spacing = options.nodeSpacing;

    // Level 1 to Level 2: Context to Aggregates (only if aggregates exist)
    if (aggregatesY > 0 && context.aggregates.length > 0) {
      const aggregatesStartX = centerX - ((context.aggregates.length - 1) * spacing) / 2;
      context.aggregates.forEach((_aggregate, index) => {
        const aggregateX = aggregatesStartX + index * spacing;
        connections.push(
          this.createArrowConnection(
            centerX,
            contextY + 25, // From bottom of context
            aggregateX,
            aggregatesY - 25, // To top of aggregate
          ),
        );
      });
    }

    // Level 2 to Level 3: Aggregates to Repositories (only if both exist)
    if (aggregatesY > 0 && repositoriesY > 0 && context.repositories.length > 0) {
      const aggregatesStartX = centerX - ((context.aggregates.length - 1) * spacing) / 2;
      // Offset repositories slightly to avoid overlapping with aggregates
      const repositoriesStartX =
        centerX - ((context.repositories.length - 1) * spacing) / 2 + spacing * 0.1;
      context.repositories.forEach((repository, index) => {
        const repositoryX = repositoriesStartX + index * spacing;
        // Find corresponding aggregate
        const aggregateIndex = context.aggregates.findIndex(
          (agg) => agg.repository.name === repository.name,
        );
        if (aggregateIndex >= 0) {
          const aggregateX = aggregatesStartX + aggregateIndex * spacing;
          connections.push(
            this.createArrowConnection(
              aggregateX,
              aggregatesY + 25, // From bottom of aggregate
              repositoryX,
              repositoriesY - 20, // To top of repository
            ),
          );
        }
      });
    }

    // Level 2 to Level 4: Aggregates to Entities (only if both exist)
    if (aggregatesY > 0 && entitiesY > 0 && context.entities.length > 0) {
      const aggregatesStartX = centerX - ((context.aggregates.length - 1) * spacing) / 2;
      const entitiesStartX = centerX - ((context.entities.length - 1) * spacing) / 2;
      context.entities.forEach((entity, index) => {
        const entityX = entitiesStartX + index * spacing;

        // Try to find corresponding aggregate using multiple strategies
        let aggregateIndex = -1;

        // Strategy 1: Direct name matching
        aggregateIndex = context.aggregates.findIndex(
          (agg) =>
            agg.name.toLowerCase().includes(entity.name.toLowerCase()) ||
            entity.name.toLowerCase().includes(agg.name.toLowerCase()),
        );

        // Strategy 2: Check if entity is in aggregate's entities list
        if (aggregateIndex === -1) {
          aggregateIndex = context.aggregates.findIndex((agg) =>
            agg.entities.includes(entity.name),
          );
        }

        // Strategy 3: If no match, try to match by position (left to right)
        if (aggregateIndex === -1 && index < context.aggregates.length) {
          aggregateIndex = index;
        }

        // Strategy 4: If still no match, use the first aggregate as fallback
        if (aggregateIndex === -1) {
          aggregateIndex = 0;
        }

        if (aggregateIndex >= 0 && aggregateIndex < context.aggregates.length) {
          // Calculate the actual X position of the aggregate based on its layout position
          const aggregateX = aggregatesStartX + aggregateIndex * spacing;
          connections.push(
            this.createArrowConnection(
              aggregateX,
              aggregatesY + 25, // From bottom of aggregate
              entityX,
              entitiesY - 20, // To top of entity
            ),
          );
        }
      });
    }

    // Direct connection from Context to Entities if no aggregates/repositories exist
    if (aggregatesY === 0 && repositoriesY === 0 && entitiesY > 0 && context.entities.length > 0) {
      const entitiesStartX = centerX - ((context.entities.length - 1) * spacing) / 2;
      context.entities.forEach((_entity, index) => {
        const entityX = entitiesStartX + index * spacing;
        connections.push(
          this.createArrowConnection(
            centerX,
            contextY + 25, // From bottom of context
            entityX,
            entitiesY - 20, // To top of entity
          ),
        );
      });
    }

    return connections;
  }

  /**
   * Create an arrow connection between two points
   */
  private createArrowConnection(fromX: number, fromY: number, toX: number, toY: number): string {
    return `
      <line
        x1="${fromX}"
        y1="${fromY}"
        x2="${toX}"
        y2="${toY}"
        stroke="#00684A"
        stroke-width="2"
        stroke-dasharray="5,5"
        marker-end="url(#arrowhead)"
      />`;
  }
}

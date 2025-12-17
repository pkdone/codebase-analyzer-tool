export interface DomainDiagramConfig {
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly padding: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly nodeSpacing: number;
  readonly colors: {
    readonly contextFill: string;
    readonly contextStroke: string;
    readonly aggregateFill: string;
    readonly aggregateStroke: string;
    readonly entityFill: string;
    readonly entityStroke: string;
    readonly repositoryFill: string;
    readonly repositoryStroke: string;
    readonly connectionStroke: string;
    readonly textColor: string;
    readonly backgroundColor: string;
  };
}

/**
 * Configuration for domain model SVG generation
 */
export const domainDiagramConfig: DomainDiagramConfig = {
  defaultWidth: 1000,
  defaultHeight: 600,
  padding: 40,
  fontSize: 11,
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  nodeSpacing: 120,
  colors: {
    contextFill: "#e8f5e8",
    contextStroke: "#00684A",
    aggregateFill: "#ffffff",
    aggregateStroke: "#00ED64",
    entityFill: "#f0f8ff",
    entityStroke: "#00684A",
    repositoryFill: "#fff5f0",
    repositoryStroke: "#00684A",
    connectionStroke: "#00684A",
    textColor: "#001e2b",
    backgroundColor: "#f8f9fa",
  },
} as const;

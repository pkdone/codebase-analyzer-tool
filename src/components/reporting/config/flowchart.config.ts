export interface FlowchartConfig {
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly nodeWidth: number;
  readonly nodeHeight: number;
  readonly padding: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly colors: {
    readonly nodeFill: string;
    readonly nodeStroke: string;
    readonly connectionStroke: string;
    readonly textColor: string;
    readonly backgroundColor: string;
  };
}

/**
 * Configuration for flowchart SVG generation
 */
export const flowchartConfig: FlowchartConfig = {
  defaultWidth: 800,
  defaultHeight: 400,
  nodeWidth: 150,
  nodeHeight: 60,
  padding: 40,
  fontSize: 12,
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  colors: {
    nodeFill: "#ffffff",
    nodeStroke: "#00684A",
    connectionStroke: "#00684A",
    textColor: "#001e2b",
    backgroundColor: "#f8f9fa",
  },
} as const;

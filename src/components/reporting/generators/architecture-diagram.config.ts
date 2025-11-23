export interface ArchitectureDiagramConfig {
  readonly defaultWidth: number;
  readonly defaultHeight: number;
  readonly padding: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly serviceSpacing: number;
  readonly colors: {
    readonly serviceFill: string;
    readonly serviceStroke: string;
    readonly connectionStroke: string;
    readonly textColor: string;
    readonly subtitleColor: string;
    readonly backgroundColor: string;
  };
}

/**
 * Configuration for architecture SVG generation
 */
export const architectureDiagramConfig: ArchitectureDiagramConfig = {
  defaultWidth: 1200,
  defaultHeight: 800,
  padding: 40,
  fontSize: 11,
  fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  serviceSpacing: 200,
  colors: {
    serviceFill: "#ffffff",
    serviceStroke: "#00684A",
    connectionStroke: "#00ED64",
    textColor: "#001e2b",
    subtitleColor: "#00684A",
    backgroundColor: "#f8f9fa",
  },
} as const;

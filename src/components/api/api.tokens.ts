/**
 * API/MCP module tokens for dependency injection.
 * These tokens are used to identify and inject API-related dependencies.
 */
export const apiTokens = {
  InsightsDataProvider: Symbol("InsightsDataProvider"),
  McpServerFactory: Symbol("McpServerFactory"),
  McpHttpServer: Symbol("McpHttpServer"),
} as const;

export type ApiToken = keyof typeof apiTokens;

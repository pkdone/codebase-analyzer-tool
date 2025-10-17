/**
 * Core application-wide dependency injection tokens.
 * These are re-exported from the legacy `TOKENS` object for modular clarity.
 */
import { TOKENS } from "../tokens";

export const coreTokens = {
  MongoClient: TOKENS.MongoClient,
  DatabaseName: TOKENS.DatabaseName,
  MongoDBClientFactory: TOKENS.MongoDBClientFactory,
  LLMRouter: TOKENS.LLMRouter,
  LLMProviderManager: TOKENS.LLMProviderManager,
  LLMModelFamily: TOKENS.LLMModelFamily,
  EnvVars: TOKENS.EnvVars,
  ProjectName: TOKENS.ProjectName,
  ShutdownService: TOKENS.ShutdownService,
  Shutdownable: TOKENS.Shutdownable,
  FileTypeMappingsConfig: TOKENS.FileTypeMappingsConfig,
} as const;

export type CoreToken = keyof typeof coreTokens;

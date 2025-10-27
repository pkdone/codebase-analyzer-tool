/**
 * Core application-wide dependency injection tokens.
 */
export const coreTokens = {
  MongoClient: Symbol("MongoClient"),
  DatabaseName: Symbol("DatabaseName"),
  MongoDBClientFactory: Symbol("MongoDBClientFactory"),
  LLMRouter: Symbol("LLMRouter"),
  LLMProviderManager: Symbol("LLMProviderManager"),
  LLMModelFamily: Symbol("LLMModelFamily"),
  EnvVars: Symbol("EnvVars"),
  ProjectName: Symbol("ProjectName"),
  ShutdownService: Symbol("ShutdownService"),
  Shutdownable: Symbol("IShutdownable"),
  FileTypeMappingsConfig: Symbol("FileTypeMappingsConfig"),
} as const;

export type CoreToken = keyof typeof coreTokens;

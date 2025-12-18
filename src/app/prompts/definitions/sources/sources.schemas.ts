import { z } from "zod";
import { sourceConfigMap } from "./sources.config";
import { sourceSummarySchema } from "../../../schemas/sources.schema";
import type { CanonicalFileType } from "../../../components/capture/config/file-types.config";

/**
 * Helper function to create a picked schema for a given config entry.
 * Dynamically selects only the fields specified in the config's schemaFields array.
 */
const createSchema = (config: (typeof sourceConfigMap)[keyof typeof sourceConfigMap]) => {
  const schemaFields = config.schemaFields.reduce<Record<string, true>>((acc, field) => {
    acc[field] = true;
    return acc;
  }, {});
  return sourceSummarySchema.pick(schemaFields as Parameters<typeof sourceSummarySchema.pick>[0]);
};

/**
 * Strongly-typed mapping of canonical file types to their Zod schemas.
 * This preserves type information for compile-time inference, unlike the
 * PromptDefinition.responseSchema which is typed as z.ZodType.
 *
 * This mirrors the pattern used in app-summaries.schema.ts for appSummaryCategorySchemas,
 * enabling strong type safety throughout the file summarization call chain.
 *
 * Each schema is built by picking specific fields from sourceSummarySchema based on
 * the schemaFields configuration in sourceConfigMap.
 *
 * Use this mapping when you need TypeScript to infer the correct return type
 * based on a file type key, rather than getting a generic z.ZodType.
 */
export const sourcePromptSchemas = {
  java: createSchema(sourceConfigMap.java),
  javascript: createSchema(sourceConfigMap.javascript),
  sql: createSchema(sourceConfigMap.sql),
  xml: createSchema(sourceConfigMap.xml),
  jsp: createSchema(sourceConfigMap.jsp),
  markdown: createSchema(sourceConfigMap.markdown),
  csharp: createSchema(sourceConfigMap.csharp),
  ruby: createSchema(sourceConfigMap.ruby),
  maven: createSchema(sourceConfigMap.maven),
  gradle: createSchema(sourceConfigMap.gradle),
  ant: createSchema(sourceConfigMap.ant),
  npm: createSchema(sourceConfigMap.npm),
  python: createSchema(sourceConfigMap.python),
  "dotnet-proj": createSchema(sourceConfigMap["dotnet-proj"]),
  nuget: createSchema(sourceConfigMap.nuget),
  "ruby-bundler": createSchema(sourceConfigMap["ruby-bundler"]),
  "python-pip": createSchema(sourceConfigMap["python-pip"]),
  "python-setup": createSchema(sourceConfigMap["python-setup"]),
  "python-poetry": createSchema(sourceConfigMap["python-poetry"]),
  "shell-script": createSchema(sourceConfigMap["shell-script"]),
  "batch-script": createSchema(sourceConfigMap["batch-script"]),
  jcl: createSchema(sourceConfigMap.jcl),
  default: createSchema(sourceConfigMap.default),
} as const satisfies Record<CanonicalFileType, z.ZodObject<z.ZodRawShape>>;

/**
 * Type representing the strongly-typed file-type-to-schema mapping.
 * Use with z.infer<SourcePromptSchemas[FileType]> to get the inferred type for a file type.
 */
export type SourcePromptSchemas = typeof sourcePromptSchemas;

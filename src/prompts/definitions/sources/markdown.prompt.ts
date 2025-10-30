import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";

export const markdownPrompt: SourcePromptTemplate = {
  contentDesc: "Markdown content",
  hasComplexSchema: false,
  responseSchema: sourceSummarySchema.pick({
    purpose: true,
    implementation: true,
  }),
  instructions: [
    {
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
  ],
};

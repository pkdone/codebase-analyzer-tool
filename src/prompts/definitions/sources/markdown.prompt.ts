import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_PROMPT_FRAGMENTS } from "./common-fragments";

export const markdownPrompt: SourcePromptTemplate = {
  contentDesc: "Markdown content",
  hasComplexSchema: false,
  responseSchema: sourceSummarySchema.pick({
    purpose: true,
    implementation: true,
  }),
  instructions: [
    {
      points: [
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ],
    },
  ],
};

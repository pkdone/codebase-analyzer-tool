import { CanonicalFileType } from "../../types/sources.types";
import { antPrompt } from "./ant.prompt";
import { batchscriptPrompt } from "./batch-script.prompt";
import { csharpPrompt } from "./csharp.prompt";
import { defaultPrompt } from "./default.prompt";
import { dotnetprojPrompt } from "./dotnet-proj.prompt";
import { gradlePrompt } from "./gradle.prompt";
import { javaPrompt } from "./java.prompt";
import { javascriptPrompt } from "./javascript.prompt";
import { jclPrompt } from "./jcl.prompt";
import { jspPrompt } from "./jsp.prompt";
import { markdownPrompt } from "./markdown.prompt";
import { mavenPrompt } from "./maven.prompt";
import { npmPrompt } from "./npm.prompt";
import { nugetPrompt } from "./nuget.prompt";
import { pythonpipPrompt } from "./python-pip.prompt";
import { pythonpoetryPrompt } from "./python-poetry.prompt";
import { pythonPrompt } from "./python.prompt";
import { pythonsetupPrompt } from "./python-setup.prompt";
import { rubybundlerPrompt } from "./ruby-bundler.prompt";
import { rubyPrompt } from "./ruby.prompt";
import { shellscriptPrompt } from "./shell-script.prompt";
import { sqlPrompt } from "./sql.prompt";
import { xmlPrompt } from "./xml.prompt";

/**
 * Data-driven mapping of prompt types to their templates and schemas
 */
export const fileTypePromptMetadata: Record<CanonicalFileType, typeof defaultPrompt> = {
  ant: antPrompt,
  "batch-script": batchscriptPrompt,
  csharp: csharpPrompt,
  default: defaultPrompt,
  "dotnet-proj": dotnetprojPrompt,
  gradle: gradlePrompt,
  java: javaPrompt,
  javascript: javascriptPrompt,
  jcl: jclPrompt,
  jsp: jspPrompt,
  markdown: markdownPrompt,
  maven: mavenPrompt,
  npm: npmPrompt,
  nuget: nugetPrompt,
  "python-pip": pythonpipPrompt,
  "python-poetry": pythonpoetryPrompt,
  python: pythonPrompt,
  "python-setup": pythonsetupPrompt,
  "ruby-bundler": rubybundlerPrompt,
  ruby: rubyPrompt,
  "shell-script": shellscriptPrompt,
  sql: sqlPrompt,
  xml: xmlPrompt,
} as const;

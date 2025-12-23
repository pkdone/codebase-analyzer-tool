import { LLMSanitizerConfig } from "../../../../common/llm/config/llm-module-config.types";

/**
 * Schema-specific constants for sanitizers.
 * These constants are tied to the sourceSummarySchema structure used in code analysis.
 * They are domain-specific and should not be part of the generic LLM module.
 *
 * These property names are specific to the sourceSummarySchema:
 * - purpose, name, description, implementation (top-level source summary fields)
 * - parameters, returnType, type (publicFunctions fields)
 * - codeSmells, references (other schema fields)
 */

/**
 * Mapping of truncated property name fragments to their full property names.
 * Used by sanitizers to fix cases where property names got truncated
 * in LLM responses (e.g., "purpose" -> "se", "codeSmells" -> "alues").
 */
export const COMMON_PROPERTY_STARTS: Readonly<Record<string, string>> = {
  se: "purpose",
  na: "name",
  nam: "name",
  pu: "purpose",
  purpos: "purpose",
  purpo: "purpose",
  de: "description",
  descript: "description",
  im: "implementation",
  implemen: "implementation",
  pa: "parameters",
  re: "returnType",
  retur: "returnType",
  ty: "type",
  alues: "codeSmells",
  lues: "codeSmells",
  ues: "codeSmells",
  es: "codeSmells",
  eferences: "references",
  refere: "references",
  refer: "references",
} as const;

/**
 * Comprehensive mapping of truncated property name fragments to their full property names.
 * This is an extended version that includes more truncation patterns beyond COMMON_PROPERTY_STARTS.
 * Used by the unified syntax sanitizer for property name fixes.
 */
export const PROPERTY_NAME_MAPPINGS: Readonly<Record<string, string>> = {
  // === General truncations ===
  eferences: "references",
  refere: "references",
  refer: "references",
  se: "purpose",
  nam: "name",
  na: "name",
  alues: "codeSmells",
  lues: "codeSmells",
  ues: "codeSmells",
  es: "codeSmells",
  integra: "integration",
  integrat: "integration",
  implemen: "implementation",
  purpos: "purpose",
  purpo: "purpose",
  descript: "description",
  retur: "return",
  metho: "functions",
  method: "functions",
  functi: "functions",
  functio: "functions",
  function: "functions",
  constan: "constants",
  consta: "constants",
  databas: "database",
  qualit: "quality",
  metric: "metrics",
  metri: "metrics",
  smell: "smells",
  smel: "smells",
  complexi: "complexity",
  complex: "complexity",
  averag: "average",
  avera: "average",
  maxim: "maximum",
  maxi: "maximum",
  minim: "minimum",
  mini: "minimum",
  lengt: "length",
  leng: "length",
  total: "total",
  tota: "total",
  clas: "class",
  interfac: "interface",
  interfa: "interface",
  interf: "interface",
  inter: "interface",
  namespac: "namespace",
  namespa: "namespace",
  namesp: "namespace",
  names: "namespace",
  publi: "public",
  publ: "public",
  privat: "private",
  priva: "private",
  priv: "private",
  protec: "protected",
  prote: "protected",
  prot: "protected",
  stati: "static",
  stat: "static",
  fina: "final",
  abstrac: "abstract",
  abstra: "abstract",
  abst: "abstract",
  synchronize: "synchronized",
  synchroniz: "synchronized",
  synchroni: "synchronized",
  synchron: "synchronized",
  synchro: "synchronized",
  synchr: "synchronized",
  synch: "synchronized",
  sync: "synchronized",
  volatil: "volatile",
  volati: "volatile",
  volat: "volatile",
  vola: "volatile",
  transien: "transient",
  transie: "transient",
  transi: "transient",
  trans: "transient",
  tran: "transient",
  nativ: "native",
  nati: "native",
  strictf: "strictfp",
  strict: "strictfp",
  stric: "strictfp",
  stri: "strictfp",
  e: "name",
  n: "name",
  m: "name",
  am: "name",
  me: "name",
  extraReferences: "externalReferences",
  exterReferences: "externalReferences",
  externReferences: "externalReferences",
  externalRefs: "externalReferences",
  externalRef: "externalReferences",
  internReferences: "internalReferences",
  internalRefs: "internalReferences",
  internalRef: "internalReferences",
  publMethods: "publicFunctions",
  publicMeth: "publicFunctions",
  publicMeths: "publicFunctions",
  publFunctions: "publicFunctions",
  publicFunc: "publicFunctions",
  publicFuncs: "publicFunctions",
  _publicConstants: "publicConstants",
  publConstants: "publicConstants",
  publicConst: "publicConstants",
  publicConsts: "publicConstants",
  integrationPt: "integrationPoints",
  integrationPts: "integrationPoints",
  integPoints: "integrationPoints",
  dbIntegration: "databaseIntegration",
  databaseInteg: "databaseIntegration",
  qualityMetrics: "codeQualityMetrics",
  codeMetrics: "codeQualityMetrics",
  codeQuality: "codeQualityMetrics",
  ethods: "publicFunctions",
  thods: "publicFunctions",
  unctions: "publicFunctions",
  nctions: "publicFunctions",
  nstants: "publicConstants",
  stants: "publicConstants",
  ants: "publicConstants",
  egrationPoints: "integrationPoints",
  grationPoints: "integrationPoints",
  rationPoints: "integrationPoints",
  ationPoints: "integrationPoints",
  ernalReferences: "internalReferences",
  alReferences: "externalReferences",
  aseIntegration: "databaseIntegration",
  seIntegration: "databaseIntegration",
  QualityMetrics: "codeQualityMetrics",
  ameters: "parameters",
  meters: "parameters",
  eters: "parameters",
  ferences: "references",
  pu: "purpose",
  pur: "purpose",
  purp: "purpose",
  de: "description",
  des: "description",
  desc: "description",
  descr: "description",
  descri: "description",
  descrip: "description",
  descripti: "description",
  descriptio: "description",
  pa: "parameters",
  par: "parameters",
  para: "parameters",
  param: "parameters",
  parame: "parameters",
  paramet: "parameters",
  paramete: "parameters",
  re: "returnType",
  ret: "returnType",
  retu: "returnType",
  return: "returnType",
  returnT: "returnType",
  returnTy: "returnType",
  returnTyp: "returnType",
  im: "implementation",
  imp: "implementation",
  impl: "implementation",
  imple: "implementation",
  implem: "implementation",
  impleme: "implementation",
  implementa: "implementation",
  implementat: "implementation",
  implementati: "implementation",
  implementatio: "implementation",
} as const;

/**
 * Known property name typo corrections for quoted properties.
 * These handle trailing underscores, double underscores, and common typos.
 */
export const PROPERTY_TYPO_CORRECTIONS: Readonly<Record<string, string>> = {
  type_: "type",
  name_: "name",
  value_: "value",
  purpose_: "purpose",
  description_: "description",
  parameters_: "parameters",
  returnType_: "returnType",
  "return a": "returnType",
  "return ": "returnType",
  cyclomaticComplexity_: "cyclomaticComplexity",
  cyclometicComplexity: "cyclomaticComplexity",
  cyclometicComplexity_: "cyclomaticComplexity",
  linesOfCode_: "linesOfCode",
  codeSmells_: "codeSmells",
  implementation_: "implementation",
  namespace_: "namespace",
  kind_: "kind",
  internalReferences_: "internalReferences",
  externalReferences_: "externalReferences",
  publicConstants_: "publicConstants",
  publicMethods_: "publicFunctions",
  publicFunctions_: "publicFunctions",
  integrationPoints_: "integrationPoints",
  databaseIntegration_: "databaseIntegration",
  dataInputFields_: "dataInputFields",
  codeQualityMetrics_: "codeQualityMetrics",
  // Common LLM typos for property names
  nameprobably: "name",
  namelikely: "name",
  namemaybe: "name",
  typeprobably: "type",
  valueprobably: "value",
} as const;

/**
 * Known property names from the sourceSummarySchema.
 * Used to validate if an unquoted identifier is likely a property name.
 */
export const KNOWN_PROPERTIES: readonly string[] = [
  "name",
  "purpose",
  "description",
  "parameters",
  "returntype",
  "cyclomaticcomplexity",
  "linesofcode",
  "codesmells",
  "type",
  "value",
  "returnType",
  "cyclomaticComplexity",
  "linesOfCode",
  "codeSmells",
  "mechanism",
  "path",
  "method",
  "direction",
  "requestbody",
  "responsebody",
  "internalreferences",
  "externalreferences",
  "publicconstants",
  "publicfunctions",
  "integrationpoints",
  "databaseintegration",
  "codequalitymetrics",
] as const;

/**
 * Property names that typically have numeric values.
 * Used to identify properties that should have numeric values rather than strings.
 */
export const NUMERIC_PROPERTIES: readonly string[] = [
  "cyclomaticcomplexity",
  "linesofcode",
  "totalfunctions",
  "averagecomplexity",
  "maxcomplexity",
  "averagefunctionlength",
  "complexity",
  "lines",
  "total",
  "average",
  "max",
  "min",
] as const;

/**
 * Package name prefix replacements for fixing truncated package names.
 * Maps truncated prefixes to their full package name prefixes.
 * These are use-case specific and tied to a particular codebase structure.
 */
export const PACKAGE_NAME_PREFIX_REPLACEMENTS: Readonly<Record<string, string>> = {
  "extractions.": "org.apache.fineract.portfolio.",
  "orgapache.": "org.apache.",
  "orgf.": "org.",
  "orgah.": "org.",
} as const;

/**
 * Package name typo patterns for fixing common typos in package names.
 * These are use-case specific and tied to a particular codebase structure.
 * Each entry contains a regex pattern, replacement string, and description.
 */
export interface PackageNameTypoPattern {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export const PACKAGE_NAME_TYPO_PATTERNS: readonly PackageNameTypoPattern[] = [
  { pattern: /"orgah\./g, replacement: '"org.', description: "Fixed typo: orgah -> org" },
  {
    pattern: /"org\.apachefineract\./g,
    replacement: '"org.apache.fineract.',
    description: "Fixed missing dot: org.apachefineract -> org.apache.fineract",
  },
  {
    pattern: /"orgfineract\./g,
    replacement: '"org.apache.fineract.',
    description: "Fixed missing package: orgfineract -> org.apache.fineract",
  },
  {
    pattern: /"org\.apachefineract\./g,
    replacement: '"org.apache.fineract.',
    description: "Fixed missing dot: org.apachefineract -> org.apache.fineract",
  },
] as const;

/**
 * Property names that are expected to be arrays.
 * If any of these properties have a string value, they will be converted to an empty array.
 */
export const ARRAY_PROPERTY_NAMES: readonly string[] = [
  "parameters",
  "dependencies",
  "references",
] as const;

/**
 * Returns the schema-specific sanitizer configuration for code analysis.
 * This provides the domain-specific constants used by the LLM sanitizers
 * when processing code analysis results.
 */
export function getSchemaSpecificSanitizerConfig(): LLMSanitizerConfig {
  return {
    propertyNameMappings: PROPERTY_NAME_MAPPINGS,
    propertyTypoCorrections: PROPERTY_TYPO_CORRECTIONS,
    knownProperties: KNOWN_PROPERTIES,
    numericProperties: NUMERIC_PROPERTIES,
    packageNamePrefixReplacements: PACKAGE_NAME_PREFIX_REPLACEMENTS,
    packageNameTypoPatterns: [...PACKAGE_NAME_TYPO_PATTERNS],
    arrayPropertyNames: ARRAY_PROPERTY_NAMES,
  };
}

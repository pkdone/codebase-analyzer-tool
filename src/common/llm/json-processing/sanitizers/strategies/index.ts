/**
 * Sanitizer strategy exports.
 * Each strategy handles a specific category of JSON malformations.
 */

export { concatenationFixer } from "./concatenation-fixer";
export { propertyNameFixer } from "./property-name-fixer";
export { invalidLiteralFixer } from "./invalid-literal-fixer";
export { assignmentSyntaxFixer } from "./assignment-syntax-fixer";
export { arrayElementFixer } from "./array-element-fixer";
export { unescapedQuoteFixer } from "./unescaped-quote-fixer";
export { strayContentRemover } from "./stray-content-remover";
export { duplicateEntryRemover } from "./duplicate-entry-remover";
export { textOutsideJsonRemover } from "./text-outside-json-remover";
export { extraPropertiesRemover } from "./extra-properties-remover";


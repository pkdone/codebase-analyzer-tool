import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { REPAIR_STEP } from "../constants/repair-steps.config";
import { LLM_TOKEN_ARTIFACT_REGEX } from "../constants/regex.constants";
import { logWarn } from "../../../utils/logging";
import { isInStringAt } from "../utils/parser-context-utils";

/**
 * Sanitizer that fixes LLM token artifacts in responses.
 *
 * This sanitizer addresses cases where LLM responses contain internal token artifacts
 * that leak into the output, replacing parts of property names or appearing in JSON structures.
 *
 * Supported token artifact formats:
 * - Vertex AI/Gemini: `<y_bin_123>`
 * - OpenAI-style: `<|endoftext|>`, `<|im_start|>`, `<|im_end|>`, `<|assistant|>`
 * - Common special tokens: `<pad>`, `<eos>`, `<bos>`, `<s>`, `</s>`, `<unk>`
 * - BERT/Transformer: `[EOS]`, `[PAD]`, `[UNK]`, `[CLS]`, `[SEP]`, `[MASK]`
 * - Instruction tokens: `[INST]`, `[/INST]`
 *
 * Examples of issues this sanitizer handles:
 * - `<y_bin_305>` -> removed (LLM token artifact)
 * - `<y_bin_XXX>OfCode":` -> `OfCode":` (removes artifact, let propertyAndValueSyntaxSanitizer handle the typo)
 * - `<|endoftext|>` -> removed (OpenAI end-of-text token)
 * - `[EOS]` -> removed (end-of-sequence token)
 *
 * Strategy:
 * Simply removes all LLM token artifacts. The resulting typos (e.g., `OfCode"` instead of `linesOfCode"`)
 * will be handled by the `propertyAndValueSyntaxSanitizer` sanitizer, which is more robust and maintainable.
 * This approach is safer than trying to reconstruct property names heuristically.
 */
export const fixLlmTokenArtifacts: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const repairs: string[] = [];

    // Pattern: Remove all LLM token artifacts <y_bin_XXX>
    // This is a simple, generic approach that removes the artifacts and lets
    // other sanitizers (like unifiedSyntaxSanitizer) handle any resulting typos
    // Also handles cases where the artifact appears before opening braces: `<y_bin_305>{` -> `{`
    sanitized = sanitized.replace(LLM_TOKEN_ARTIFACT_REGEX, (match, offset: number) => {
      // Check if we're inside a string literal - if so, don't modify
      if (isInStringAt(offset, sanitized)) {
        return match;
      }

      // Check if there's an opening brace immediately after the artifact
      const afterArtifact = sanitized.substring(offset + match.length, offset + match.length + 1);
      if (afterArtifact === "{") {
        // The artifact is before an opening brace, just remove the artifact
        hasChanges = true;
        repairs.push(`Removed LLM token artifact before opening brace: ${match}`);
        return "";
      }

      // Remove the artifact - let other sanitizers handle any resulting issues
      hasChanges = true;
      repairs.push(`Removed LLM token artifact: ${match}`);
      return "";
    });

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? REPAIR_STEP.FIXED_LLM_TOKEN_ARTIFACTS : undefined,
      repairs: hasChanges && repairs.length > 0 ? repairs : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    logWarn(`fixLlmTokenArtifacts sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      repairs: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

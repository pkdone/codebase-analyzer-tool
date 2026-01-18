/**
 * Barrel file for source prompt utilities.
 *
 * This module re-exports utilities that can be safely imported by both
 * source config factories and language-specific fragments without creating
 * circular dependencies.
 */
export {
  INSTRUCTION_SECTION_TITLES,
  type InstructionSectionTitle,
  buildInstructionBlock,
  createDbMechanismInstructions,
} from "./instruction-builders";

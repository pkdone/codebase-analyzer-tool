/**
 * Re-export from domain folder for backward compatibility.
 * All file type logic has been consolidated into src/app/domain/file-types.
 */
export {
  CANONICAL_FILE_TYPES,
  type CanonicalFileType,
  canonicalFileTypeSchema,
  getCanonicalFileType,
} from "../../../domain/file-types";

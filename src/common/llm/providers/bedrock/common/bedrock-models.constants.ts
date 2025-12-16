/**
 * Shared constants for Bedrock model internal keys and environment variable names.
 * These constants are used across multiple Bedrock provider manifests to avoid duplication.
 *
 * Note: Model family constants (BEDROCK_*_FAMILY) have been moved to their respective
 * manifest files to make each provider self-contained. Only truly shared constants remain here.
 */

// Shared environment variable name constants
export const BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY = "BEDROCK_TITAN_EMBEDDINGS_MODEL";

// Shared model internal key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";

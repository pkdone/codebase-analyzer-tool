/**
 * Interface for vector search filter configuration
 */
export interface VectorSearchFilter {
  type: "filter" | "string" | "token";
  path: string;
}

/**
 * Creates a vector search index definition for MongoDB Atlas Vector Search.
 *
 * @param indexName The name of the index
 * @param vectorPath The path to the vector field to index
 * @param dimensions The number of dimensions for the vector
 * @param similarity The similarity metric to use
 * @param quantization The quantization type
 * @param filters Optional array of filter field definitions
 * @returns The vector search index definition
 */
export function createVectorSearchIndexDefinition(
  indexName: string,
  vectorPath: string,
  dimensions: number,
  similarity: string,
  quantization: string,
  filters: VectorSearchFilter[] = [],
) {
  return {
    name: indexName,
    type: "vectorSearch",
    definition: {
      fields: [
        {
          type: "vector",
          path: vectorPath,
          numDimensions: dimensions,
          similarity: similarity,
          quantization: quantization,
        },
        ...filters.map((filter) => ({
          type: filter.type,
          path: filter.path,
        })),
      ],
    },
  };
}

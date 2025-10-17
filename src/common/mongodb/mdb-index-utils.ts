export interface VectorSearchFilter {
  type: "filter" | "string" | "token";
  path: string;
}

export interface VectorIndexConfig {
  field: string;
  name: string;
}

export function createVectorSearchIndexDefinition(
  indexName: string,
  vectorPath: string,
  dimensions = 1536,
  similarity = "euclidean",
  quantization = "scalar",
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

import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config.js";

export const qdrant = new QdrantClient({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey,
});

/**
 * Create the collection if it doesn't already exist.
 * Vector size must match the embedding model's dimensions.
 * Also creates payload indexes for fast filtered searches.
 */
export async function ensureCollection() {
  const name = config.qdrant.collection;
  const exists = await qdrant.collectionExists(name);

  if (!exists.exists) {
    try {
      await qdrant.createCollection(name, {
        vectors: {
          size: config.openai.embeddingDimensions,
          distance: "Cosine",
        },
      });
      console.log(`🗂️  Created Qdrant collection "${name}"`);

      // Create payload indexes for fast filtering by notebook and source
      await qdrant.createPayloadIndex(name, {
        field_name: "notebookId",
        field_schema: "keyword",
      });
      await qdrant.createPayloadIndex(name, {
        field_name: "sourceId",
        field_schema: "keyword",
      });
    } catch (err) {
      // Another concurrent worker may have created it first (409 Conflict).
      const stillMissing = !(await qdrant.collectionExists(name)).exists;
      if (stillMissing) throw err;
    }
  }

  return name;
}

/**
 * Delete vectors from Qdrant associated with a specific source.
 */
export async function deleteSourceVectors(sourceId) {
  const collection = config.qdrant.collection;
  try {
    await qdrant.delete(collection, {
      filter: {
        must: [{ key: "sourceId", match: { value: sourceId } }],
      },
    });
  } catch (err) {
    console.error(`Failed to delete vectors for source ${sourceId}:`, err.message);
  }
}

/**
 * Delete all vectors from Qdrant associated with a specific notebook.
 */
export async function deleteNotebookVectors(notebookId) {
  const collection = config.qdrant.collection;
  try {
    await qdrant.delete(collection, {
      filter: {
        must: [{ key: "notebookId", match: { value: notebookId } }],
      },
    });
  } catch (err) {
    console.error(`Failed to delete vectors for notebook ${notebookId}:`, err.message);
  }
}


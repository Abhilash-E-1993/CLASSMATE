import { QdrantClient } from "@qdrant/js-client-rest";
import { config } from "./config.js";

export const qdrant = new QdrantClient({
  url: config.qdrant.url,
  apiKey: config.qdrant.apiKey,
});

// Fallback in-memory vector database if Qdrant server is unreachable or offline
const memoryVectorStore = new Map(); // id -> { id, vector, payload }

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Ensure collection exists in Qdrant (or soft fallback).
 */
export async function ensureCollection() {
  const name = config.qdrant.collection;
  try {
    const exists = await qdrant.collectionExists(name);
    if (!exists.exists) {
      await qdrant.createCollection(name, {
        vectors: {
          size: config.openai.embeddingDimensions,
          distance: "Cosine",
        },
      });
      console.log(`🗂️  Created Qdrant collection "${name}"`);

      await qdrant.createPayloadIndex(name, {
        field_name: "notebookId",
        field_schema: "keyword",
      });
      await qdrant.createPayloadIndex(name, {
        field_name: "sourceId",
        field_schema: "keyword",
      });
    }
  } catch (err) {
    console.warn(`[Qdrant Fallback] Connection to ${config.qdrant.url} unavailable (${err.message}). Using resilient in-memory vector store.`);
  }

  return name;
}

/**
 * Safe search against Qdrant with automatic in-memory fallback.
 */
export async function safeVectorSearch(collection, vector, notebookId, limit = config.retrieval.topK) {
  try {
    const filter = notebookId
      ? { must: [{ key: "notebookId", match: { value: notebookId } }] }
      : undefined;

    return await qdrant.search(collection, {
      vector,
      filter,
      limit,
      with_payload: true,
    });
  } catch (err) {
    console.warn(`[Qdrant Search Fallback] Vector search falling back to in-memory store:`, err.message);
    const hits = [];
    for (const item of memoryVectorStore.values()) {
      if (notebookId && item.payload?.notebookId !== notebookId) continue;
      const score = cosineSimilarity(vector, item.vector);
      hits.push({ id: item.id, score, payload: item.payload });
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }
}

/**
 * Safe upsert into Qdrant with automatic in-memory fallback.
 */
export async function safeVectorUpsert(collection, points) {
  try {
    return await qdrant.upsert(collection, { wait: true, points });
  } catch (err) {
    console.warn(`[Qdrant Upsert Fallback] Storing ${points.length} points in in-memory vector store:`, err.message);
    for (const pt of points) {
      memoryVectorStore.set(pt.id, pt);
    }
    return { status: "completed" };
  }
}

/**
 * Delete vectors associated with a specific source.
 */
export async function deleteSourceVectors(sourceId) {
  const collection = config.qdrant.collection;
  try {
    await qdrant.delete(collection, {
      filter: { must: [{ key: "sourceId", match: { value: sourceId } }] },
    });
  } catch (err) {
    console.warn(`[Qdrant Delete Fallback] Purging source ${sourceId} from memory store:`, err.message);
  }
  for (const [id, item] of memoryVectorStore.entries()) {
    if (item.payload?.sourceId === sourceId) memoryVectorStore.delete(id);
  }
}

/**
 * Delete vectors associated with a specific notebook.
 */
export async function deleteNotebookVectors(notebookId) {
  const collection = config.qdrant.collection;
  try {
    await qdrant.delete(collection, {
      filter: { must: [{ key: "notebookId", match: { value: notebookId } }] },
    });
  } catch (err) {
    console.warn(`[Qdrant Delete Fallback] Purging notebook ${notebookId} from memory store:`, err.message);
  }
  for (const [id, item] of memoryVectorStore.entries()) {
    if (item.payload?.notebookId === notebookId) memoryVectorStore.delete(id);
  }
}

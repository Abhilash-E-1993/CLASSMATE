import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getRedisConfig() {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_URL;
  if (redisUrl) {
    try {
      const parsed = new URL(redisUrl);
      return {
        host: parsed.hostname,
        port: Number(parsed.port) || 6379,
        password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
        tls: parsed.protocol === "rediss:" ? {} : undefined,
      };
    } catch (e) {
      console.warn("Failed to parse REDIS_URL:", e.message);
    }
  }

  const upstashRestUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashRestToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashRestUrl) {
    const host = upstashRestUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "");
    return {
      host,
      port: Number(process.env.REDIS_PORT) || 6379,
      password: upstashRestToken || process.env.REDIS_PASSWORD || undefined,
      tls: {},
    };
  }

  return {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
  };
}

export const config = {
  port: Number(process.env.PORT) || 8000,
  dbPath: process.env.DB_PATH || path.join(__dirname, "..", "data", "app.db"),
  redis: getRedisConfig(),
  qdrant: {
    url: (process.env.QDRANT_URL || "http://127.0.0.1:6333").trim().replace(/\/+$/, ""),
    apiKey: process.env.QDRANT_API_KEY ? process.env.QDRANT_API_KEY.trim() : undefined,
    collection: process.env.QDRANT_COLLECTION || "documents",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.trim() : undefined,
    // text-embedding-3-small -> 1536 dims, text-embedding-3-large -> 3072 dims
    embeddingModel: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    embeddingDimensions: Number(process.env.EMBEDDING_DIMENSIONS) || 1536,
    chatModel: process.env.CHAT_MODEL || "gpt-4o-mini",
  },
  chunking: {
    chunkSize: Number(process.env.CHUNK_SIZE) || 1000,
    chunkOverlap: Number(process.env.CHUNK_OVERLAP) || 200,
  },
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY || "",
    secretKey: process.env.CLERK_SECRET_KEY || "",
  },
  retrieval: {
    topK: Number(process.env.RETRIEVAL_TOP_K) || 4, // per-query candidates from Qdrant
    rrfK: Number(process.env.RRF_K) || 60, // Reciprocal Rank Fusion constant
    finalK: Number(process.env.RETRIEVAL_FINAL_K) || 5, // docs kept after fusion
  },
};

// Names of the BullMQ queues.
export const SOURCE_INDEXING_QUEUE = "source-indexing";
export const QUERY_QUEUE = "query";


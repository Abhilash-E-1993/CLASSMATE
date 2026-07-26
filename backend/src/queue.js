import { Queue } from "bullmq";
import { config, SOURCE_INDEXING_QUEUE, QUERY_QUEUE } from "./config.js";

// BullMQ connection settings
export const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  tls: config.redis.tls,
  maxRetriesPerRequest: null,
};

export const sourceIndexingQueue = new Queue(SOURCE_INDEXING_QUEUE, { connection });
export const queryQueue = new Queue(QUERY_QUEUE, { connection });

// Register error listeners to log Redis connection issues gracefully without crashing
sourceIndexingQueue.on("error", (err) => {
  console.error("⚠️ [source-indexing-queue] Redis error:", err.message);
});
queryQueue.on("error", (err) => {
  console.error("⚠️ [query-queue] Redis error:", err.message);
});

/**
 * Enqueue a source indexing job (PDF, text, website, youtube, transcript).
 * @param {{ sourceId: string, notebookId: string, type: string, filePath?: string, url?: string, content?: string, title?: string }} payload
 */
export async function enqueueSourceIndexingJob(payload) {
  return sourceIndexingQueue.add("index-source", payload, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500,
  });
}

/**
 * Enqueue a notebook chat query job.
 * @param {{ notebookId: string, query: string }} payload
 */
export async function enqueueChatJob(payload) {
  return queryQueue.add("run-chat", payload, {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: { age: 3600, count: 1000 },
    removeOnFail: { age: 3600, count: 1000 },
  });
}


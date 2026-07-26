import { Worker } from "bullmq";
import { connection } from "./queue.js";
import { SOURCE_INDEXING_QUEUE, QUERY_QUEUE } from "./config.js";
import { indexSource } from "./indexer.js";
import { answerChatQuery } from "./retriever.js";

// Worker consuming source indexing jobs (PDF, text, website, youtube, transcript)
const sourceIndexingWorker = new Worker(
  SOURCE_INDEXING_QUEUE,
  async (job) => {
    console.log(`📥 Indexing job ${job.id}: [${job.data.type}] sourceId=${job.data.sourceId}`);
    const result = await indexSource(job.data);
    console.log(`   → ${result.chunks} chunk(s) indexed for source "${result.title}"`);
    return result;
  },
  { connection, concurrency: 2 }
);

// Worker consuming chat query jobs
const queryWorker = new Worker(
  QUERY_QUEUE,
  async (job) => {
    console.log(`🔎 Chat job ${job.id} for notebook ${job.data.notebookId}: "${job.data.query}"`);
    const result = await answerChatQuery(job.data);
    console.log(`   → Answered with ${result.citations.length} citation(s)`);
    return result;
  },
  { connection, concurrency: 4 }
);

for (const [name, worker] of [
  ["source-indexing", sourceIndexingWorker],
  ["chat-query", queryWorker],
]) {
  worker.on("completed", (job) => console.log(`✅ [${name}] job ${job.id} completed`));
  worker.on("failed", (job, err) => console.error(`❌ [${name}] job ${job?.id} failed:`, err.message));
}

console.log("👷 NotebookLM Background Workers started (source-indexing + chat-query). Waiting for jobs...");

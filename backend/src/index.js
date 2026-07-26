import express from "express";
import { clerkMiddleware, getAuth } from "@clerk/express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import {
  createNotebook,
  getNotebook,
  listNotebooks,
  deleteNotebook,
  createSource,
  getSource,
  getSourcesForNotebook,
  deleteSource,
  getMessagesForNotebook,
} from "./db/index.js";
import { deleteSourceVectors, deleteNotebookVectors } from "./qdrant.js";
import {
  enqueueSourceIndexingJob,
  enqueueChatJob,
  sourceIndexingQueue,
  queryQueue,
} from "./queue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");

// Ensure the uploads directory exists
fs.mkdirSync(uploadDir, { recursive: true });

// --- Multer config: store files on disk with unique timestamp filenames ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

const app = express();
app.use(express.json());

// CORS headers for frontend integration
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (_req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Mount Clerk Auth middleware (validates JWT tokens when keys are configured)
if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

// Middleware to enforce authentication on protected endpoints
const requireUserAuth = (req, res, next) => {
  if (!process.env.CLERK_SECRET_KEY) {
    return next();
  }

  const auth = getAuth(req);
  if (!auth || !auth.userId) {
    return res.status(401).json({ error: "Unauthorized: Please sign in to access workspace data" });
  }

  req.userId = auth.userId;
  next();
};

// --- Health Check ---
app.get("/health", (_req, res) => res.json({ status: "ok", app: "NotebookLM Clone API" }));

// ==========================================
// 1. NOTEBOOK ENDPOINTS
// ==========================================

// POST /notebooks : Create a new notebook
app.post("/notebooks", requireUserAuth, async (req, res) => {
  const { name } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Body must include a non-empty 'name' string" });
  }

  try {
    const notebook = await createNotebook(name.trim());
    return res.status(201).json(notebook);
  } catch (err) {
    console.error("Failed to create notebook:", err);
    return res.status(500).json({ error: "Failed to create notebook" });
  }
});

// GET /notebooks : List all notebooks
app.get("/notebooks", requireUserAuth, async (_req, res) => {
  try {
    const notebooks = await listNotebooks();
    return res.json(notebooks);
  } catch (err) {
    console.error("Failed to list notebooks:", err);
    return res.status(500).json({ error: "Failed to fetch notebooks" });
  }
});

// GET /notebooks/:id : Get notebook details
app.get("/notebooks/:id", async (req, res) => {
  try {
    const notebook = await getNotebook(req.params.id);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });
    return res.json(notebook);
  } catch (err) {
    console.error("Failed to get notebook:", err);
    return res.status(500).json({ error: "Failed to fetch notebook" });
  }
});

// DELETE /notebooks/:id : Delete notebook + purge vectors
app.delete("/notebooks/:id", async (req, res) => {
  try {
    const notebookId = req.params.id;
    const notebook = await getNotebook(notebookId);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });

    // Purge Qdrant vectors associated with this notebook
    await deleteNotebookVectors(notebookId);
    // Delete database entries
    await deleteNotebook(notebookId);

    return res.json({ message: "Notebook deleted successfully", id: notebookId });
  } catch (err) {
    console.error("Failed to delete notebook:", err);
    return res.status(500).json({ error: "Failed to delete notebook" });
  }
});

// GET /notebooks/:id/sources : List sources for a notebook
app.get("/notebooks/:id/sources", async (req, res) => {
  try {
    const sources = await getSourcesForNotebook(req.params.id);
    return res.json(sources);
  } catch (err) {
    console.error("Failed to list sources for notebook:", err);
    return res.status(500).json({ error: "Failed to fetch sources" });
  }
});

// ==========================================
// 2. SOURCE MANAGEMENT ENDPOINTS
// ==========================================

// POST /sources/upload : Upload PDF source
app.post("/sources/upload", requireUserAuth, upload.single("file"), async (req, res) => {
  const { notebookId } = req.body;
  if (!notebookId) {
    return res.status(400).json({ error: "Form-data must include 'notebookId'" });
  }
  if (!req.file) {
    return res.status(400).json({ error: "No PDF file uploaded (field: 'file')" });
  }

  try {
    const notebook = await getNotebook(notebookId);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });

    const source = await createSource({
      notebookId,
      type: "pdf",
      title: req.file.originalname,
      filePath: req.file.path,
    });

    const job = await enqueueSourceIndexingJob({
      sourceId: source.id,
      notebookId,
      type: "pdf",
      filePath: req.file.path,
      title: req.file.originalname,
    });

    return res.status(202).json({
      message: "PDF uploaded and enqueued for indexing",
      source,
      jobId: job.id,
    });
  } catch (err) {
    console.error("Failed to upload PDF source:", err);
    return res.status(500).json({ error: "Failed to process PDF upload" });
  }
});

// POST /sources/text : Plain Text source
app.post("/sources/text", requireUserAuth, async (req, res) => {
  const { notebookId, title, text } = req.body;
  if (!notebookId || !text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Body must include 'notebookId' and non-empty 'text'" });
  }

  try {
    const notebook = await getNotebook(notebookId);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });

    const sourceTitle = (title && title.trim()) || `Plain Text (${text.slice(0, 20)}...)`;

    const source = await createSource({
      notebookId,
      type: "text",
      title: sourceTitle,
    });

    const job = await enqueueSourceIndexingJob({
      sourceId: source.id,
      notebookId,
      type: "text",
      content: text,
      title: sourceTitle,
    });

    return res.status(202).json({
      message: "Text source added and enqueued for indexing",
      source,
      jobId: job.id,
    });
  } catch (err) {
    console.error("Failed to add text source:", err);
    return res.status(500).json({ error: "Failed to add text source" });
  }
});

// POST /sources/url : Website URL source
app.post("/sources/url", requireUserAuth, async (req, res) => {
  const { notebookId, title, url } = req.body;
  if (!notebookId || !url || typeof url !== "string" || !url.trim()) {
    return res.status(400).json({ error: "Body must include 'notebookId' and 'url'" });
  }

  try {
    const notebook = await getNotebook(notebookId);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });

    const sourceTitle = (title && title.trim()) || url;

    const source = await createSource({
      notebookId,
      type: "website",
      title: sourceTitle,
      url: url.trim(),
    });

    const job = await enqueueSourceIndexingJob({
      sourceId: source.id,
      notebookId,
      type: "website",
      url: url.trim(),
      title: sourceTitle,
    });

    return res.status(202).json({
      message: "Website URL source added and enqueued for indexing",
      source,
      jobId: job.id,
    });
  } catch (err) {
    console.error("Failed to add URL source:", err);
    return res.status(500).json({ error: "Failed to add URL source" });
  }
});

// POST /sources/youtube : YouTube Video URL source
app.post("/sources/youtube", requireUserAuth, async (req, res) => {
  const { notebookId, title, url } = req.body;
  if (!notebookId || !url || typeof url !== "string" || !url.trim()) {
    return res.status(400).json({ error: "Body must include 'notebookId' and YouTube 'url'" });
  }

  try {
    const notebook = await getNotebook(notebookId);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });

    const sourceTitle = (title && title.trim()) || `YouTube Video (${url})`;

    const source = await createSource({
      notebookId,
      type: "youtube",
      title: sourceTitle,
      url: url.trim(),
    });

    const job = await enqueueSourceIndexingJob({
      sourceId: source.id,
      notebookId,
      type: "youtube",
      url: url.trim(),
      title: sourceTitle,
    });

    return res.status(202).json({
      message: "YouTube source added and enqueued for indexing",
      source,
      jobId: job.id,
    });
  } catch (err) {
    console.error("Failed to add YouTube source:", err);
    return res.status(500).json({ error: "Failed to add YouTube source" });
  }
});

// POST /sources/transcript : VTT or raw transcript source
app.post("/sources/transcript", requireUserAuth, upload.single("file"), async (req, res) => {
  const { notebookId, title, content } = req.body;
  if (!notebookId) {
    return res.status(400).json({ error: "Request must include 'notebookId'" });
  }

  let transcriptContent = content;
  let sourceTitle = title || "Transcript";

  if (req.file) {
    transcriptContent = fs.readFileSync(req.file.path, "utf-8");
    sourceTitle = title || req.file.originalname;
  }

  if (!transcriptContent || !transcriptContent.trim()) {
    return res.status(400).json({ error: "Provide transcript content via body field 'content' or file upload" });
  }

  try {
    const notebook = await getNotebook(notebookId);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });

    const source = await createSource({
      notebookId,
      type: "transcript",
      title: sourceTitle,
    });

    const job = await enqueueSourceIndexingJob({
      sourceId: source.id,
      notebookId,
      type: "transcript",
      content: transcriptContent,
      title: sourceTitle,
    });

    return res.status(202).json({
      message: "Transcript source added and enqueued for indexing",
      source,
      jobId: job.id,
    });
  } catch (err) {
    console.error("Failed to add transcript source:", err);
    return res.status(500).json({ error: "Failed to add transcript source" });
  }
});

// GET /sources/:id : Get source metadata & status
app.get("/sources/:id", async (req, res) => {
  try {
    const source = await getSource(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found" });
    return res.json(source);
  } catch (err) {
    console.error("Failed to fetch source:", err);
    return res.status(500).json({ error: "Failed to fetch source" });
  }
});

// DELETE /sources/:id : Delete source and purge vectors
app.delete("/sources/:id", async (req, res) => {
  try {
    const sourceId = req.params.id;
    const source = await getSource(sourceId);
    if (!source) return res.status(404).json({ error: "Source not found" });

    // Purge Qdrant vectors
    await deleteSourceVectors(sourceId);
    // Delete database entry
    await deleteSource(sourceId);

    return res.json({ message: "Source deleted successfully", id: sourceId });
  } catch (err) {
    console.error("Failed to delete source:", err);
    return res.status(500).json({ error: "Failed to delete source" });
  }
});

// POST /sources/:id/reindex : Re-trigger indexing for a source
app.post("/sources/:id/reindex", async (req, res) => {
  try {
    const source = await getSource(req.params.id);
    if (!source) return res.status(404).json({ error: "Source not found" });

    // Remove existing vectors before re-indexing
    await deleteSourceVectors(source.id);

    const job = await enqueueSourceIndexingJob({
      sourceId: source.id,
      notebookId: source.notebookId,
      type: source.type,
      filePath: source.filePath,
      url: source.url,
      title: source.title,
    });

    return res.status(202).json({
      message: "Re-indexing enqueued",
      sourceId: source.id,
      jobId: job.id,
    });
  } catch (err) {
    console.error("Failed to reindex source:", err);
    return res.status(500).json({ error: "Failed to reindex source" });
  }
});

// ==========================================
// 3. CHAT & CONVERSATION ENDPOINTS
// ==========================================

// POST /chat : Submit a question to a notebook
app.post("/chat", requireUserAuth, async (req, res) => {
  const { notebookId, query } = req.body;
  if (!notebookId || !query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Body must include 'notebookId' and non-empty 'query'" });
  }

  try {
    const notebook = await getNotebook(notebookId);
    if (!notebook) return res.status(404).json({ error: "Notebook not found" });

    const job = await enqueueChatJob({
      notebookId,
      query: query.trim(),
    });

    return res.status(202).json({
      message: "Chat query queued",
      jobId: job.id,
      poll: `/jobs/${job.id}`,
    });
  } catch (err) {
    console.error("Failed to enqueue chat job:", err);
    return res.status(500).json({ error: "Failed to queue chat query" });
  }
});

// GET /chat/history/:notebookId : Get conversation history for notebook
app.get("/chat/history/:notebookId", async (req, res) => {
  try {
    const messages = await getMessagesForNotebook(req.params.notebookId, 50);
    return res.json(messages);
  } catch (err) {
    console.error("Failed to fetch chat history:", err);
    return res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

// ==========================================
// 4. JOB POLLING ENDPOINT
// ==========================================

// GET /jobs/:id : Poll BullMQ status for source indexing or chat job
app.get("/jobs/:id", async (req, res) => {
  const jobId = req.params.id;
  try {
    // Check sourceIndexingQueue first, then queryQueue
    let job = await sourceIndexingQueue.getJob(jobId);
    let queueName = "source-indexing";

    if (!job) {
      job = await queryQueue.getJob(jobId);
      queueName = "chat-query";
    }

    if (!job) {
      return res.status(404).json({ error: "Job not found in queues" });
    }

    const state = await job.getState();

    if (state === "completed") {
      return res.json({
        jobId: job.id,
        queue: queueName,
        status: state,
        result: job.returnvalue,
      });
    }
    if (state === "failed") {
      return res.status(200).json({
        jobId: job.id,
        queue: queueName,
        status: state,
        error: job.failedReason,
      });
    }

    return res.json({ jobId: job.id, queue: queueName, status: state });
  } catch (err) {
    console.error("Failed to fetch job status:", err);
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
});

// Error handler middleware
app.use((err, _req, res, _next) => {
  console.error("Express Error Handler:", err);
  return res.status(400).json({ error: err.message });
});

// Start BullMQ background worker inside the same process when running in production/Render
if (process.env.NODE_ENV === "production" || process.env.EMBED_WORKER === "true" || process.env.RENDER) {
  import("./worker.js")
    .then(() => console.log("👷 In-process BullMQ worker active on Render."))
    .catch((err) => console.error("⚠️ In-process worker startup warning:", err.message));
}

app.listen(config.port, () => {
  console.log(`🚀 NotebookLM Clone Backend Server listening on port ${config.port}`);
});

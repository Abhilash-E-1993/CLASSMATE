import crypto from "node:crypto";
import { config } from "./config.js";
import { qdrant, ensureCollection } from "./qdrant.js";
import { embedTexts } from "./openai.js";
import { updateSourceStatus } from "./db/index.js";
import { extractPdfText } from "./extractors/pdfExtractor.js";
import { extractWebPage } from "./extractors/webExtractor.js";
import { extractYoutubeTranscript } from "./extractors/youtubeExtractor.js";
import { extractTranscript } from "./extractors/vttExtractor.js";

/**
 * Split text into overlapping chunks (~chunkSize chars, chunkOverlap overlap),
 * breaking on whitespace boundaries where possible.
 */
export function chunkText(text, chunkSize = config.chunking.chunkSize, overlap = config.chunking.chunkOverlap) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];

  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + chunkSize, clean.length);

    if (end < clean.length) {
      const lastSpace = clean.lastIndexOf(" ", end);
      if (lastSpace > start) end = lastSpace;
    }

    const chunk = clean.slice(start, end).trim();
    if (chunk) chunks.push(chunk);

    if (end >= clean.length) break;
    start = end - overlap;
    if (start < 0) start = 0;
  }

  return chunks;
}

/**
 * Split transcript cue items into chunk windows while preserving timestamp ranges.
 */
export function chunkTranscriptItems(items, chunkSize = config.chunking.chunkSize) {
  if (!items || items.length === 0) return [];

  const chunks = [];
  let currentText = [];
  let currentLength = 0;
  let currentStart = items[0].startTime;
  let currentEnd = items[0].endTime;

  for (const item of items) {
    if (currentLength + item.text.length > chunkSize && currentText.length > 0) {
      chunks.push({
        text: currentText.join(" "),
        startTime: currentStart,
        endTime: currentEnd,
      });
      currentText = [item.text];
      currentLength = item.text.length;
      currentStart = item.startTime;
      currentEnd = item.endTime;
    } else {
      currentText.push(item.text);
      currentLength += item.text.length;
      currentEnd = item.endTime;
    }
  }

  if (currentText.length > 0) {
    chunks.push({
      text: currentText.join(" "),
      startTime: currentStart,
      endTime: currentEnd,
    });
  }

  return chunks;
}

/**
 * Main ingestion handler for all source types.
 * @param {{ sourceId: string, notebookId: string, type: string, filePath?: string, url?: string, content?: string, title?: string }} param0
 */
export async function indexSource({ sourceId, notebookId, type, filePath, url, content, title }) {
  await updateSourceStatus(sourceId, "indexing");

  try {
    const collection = await ensureCollection();
    let extractedText = "";
    let sourceTitle = title || "Untitled Source";
    let sourceUrl = url || null;
    let chunksWithMeta = [];

    if (type === "pdf") {
      const pdf = await extractPdfText(filePath);
      extractedText = pdf.text;
      const textChunks = chunkText(extractedText);
      chunksWithMeta = textChunks.map((t, idx) => ({
        text: t,
        chunkIndex: idx,
        page: null,
        startTime: null,
        endTime: null,
      }));
    } else if (type === "text") {
      extractedText = content || "";
      const textChunks = chunkText(extractedText);
      chunksWithMeta = textChunks.map((t, idx) => ({
        text: t,
        chunkIndex: idx,
        page: null,
        startTime: null,
        endTime: null,
      }));
    } else if (type === "website") {
      const page = await extractWebPage(url);
      sourceTitle = title || page.title;
      sourceUrl = page.url;
      extractedText = page.text;
      const textChunks = chunkText(extractedText);
      chunksWithMeta = textChunks.map((t, idx) => ({
        text: t,
        chunkIndex: idx,
        page: null,
        startTime: null,
        endTime: null,
      }));
    } else if (type === "youtube") {
      const yt = await extractYoutubeTranscript(url);
      sourceTitle = title || yt.title;
      sourceUrl = yt.url;
      const transcriptChunks = chunkTranscriptItems(yt.items);
      chunksWithMeta = transcriptChunks.map((c, idx) => ({
        text: c.text,
        chunkIndex: idx,
        page: null,
        startTime: c.startTime,
        endTime: c.endTime,
      }));
    } else if (type === "transcript") {
      const parsed = extractTranscript(content || "");
      if (parsed.items.length > 0) {
        const transcriptChunks = chunkTranscriptItems(parsed.items);
        chunksWithMeta = transcriptChunks.map((c, idx) => ({
          text: c.text,
          chunkIndex: idx,
          page: null,
          startTime: c.startTime,
          endTime: c.endTime,
        }));
      } else {
        const textChunks = chunkText(parsed.text);
        chunksWithMeta = textChunks.map((t, idx) => ({
          text: t,
          chunkIndex: idx,
          page: null,
          startTime: null,
          endTime: null,
        }));
      }
    } else {
      throw new Error(`Unsupported source type: ${type}`);
    }

    if (chunksWithMeta.length === 0) {
      await updateSourceStatus(sourceId, "ready", { chunkCount: 0 });
      return { chunks: 0, message: "No text extracted from source" };
    }

    // Embed all chunk texts
    const vectors = await embedTexts(chunksWithMeta.map((c) => c.text));

    // Construct Qdrant points with strict payload metadata
    const points = chunksWithMeta.map((chunk, i) => ({
      id: crypto.randomUUID(),
      vector: vectors[i],
      payload: {
        notebookId,
        sourceId,
        sourceType: type,
        title: sourceTitle,
        chunkIndex: chunk.chunkIndex,
        page: chunk.page,
        startTime: chunk.startTime,
        endTime: chunk.endTime,
        text: chunk.text,
        url: sourceUrl,
      },
    }));

    // Upsert into Qdrant
    await qdrant.upsert(collection, { wait: true, points });

    // Update SQLite status to ready
    await updateSourceStatus(sourceId, "ready", { chunkCount: chunksWithMeta.length });

    return { chunks: chunksWithMeta.length, collection, title: sourceTitle };
  } catch (err) {
    console.error(`Error indexing source ${sourceId}:`, err);
    await updateSourceStatus(sourceId, "error", { errorMessage: err.message });
    throw err;
  }
}

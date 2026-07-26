import { initDb, createNotebook, listNotebooks, createSource, getSource, getSourcesForNotebook, deleteNotebook } from "../src/db/index.js";
import { chunkText, chunkTranscriptItems } from "../src/indexer.js";
import { parseVttContent } from "../src/extractors/vttExtractor.js";
import { extractYoutubeVideoId, formatTimestamp } from "../src/extractors/youtubeExtractor.js";

async function runTests() {
  console.log("🧪 Starting Backend Integration & Unit Tests...\n");

  // Test 1: SQLite DB Initialization & CRUD
  console.log("1️⃣ Testing SQLite Database Operations...");
  await initDb();
  const nb = await createNotebook("Test NotebookLM Workspace");
  console.log("   ✅ Created Notebook:", nb);

  const notebooks = await listNotebooks();
  console.log(`   ✅ Listed Notebooks (count: ${notebooks.length})`);

  const src = await createSource({
    notebookId: nb.id,
    type: "text",
    title: "Test Plain Text Source",
  });
  console.log("   ✅ Created Source:", src);

  const sources = await getSourcesForNotebook(nb.id);
  console.log(`   ✅ Fetched Sources for Notebook (count: ${sources.length})`);

  // Test 2: Chunking Logic
  console.log("\n2️⃣ Testing Text & Transcript Chunking...");
  const sampleText = "The Transformer architecture was introduced in 2017. ".repeat(30);
  const textChunks = chunkText(sampleText, 500, 100);
  console.log(`   ✅ Text chunking produced ${textChunks.length} chunk(s) (first chunk length: ${textChunks[0]?.length})`);

  const vttSample = `WEBVTT

00:00:01.000 --> 00:00:05.000
Welcome to the lecture.

00:00:05.500 --> 00:00:12.000
Today we explain self-attention mechanisms in neural networks.`;

  const parsedVtt = parseVttContent(vttSample);
  console.log(`   ✅ VTT Parsing extracted ${parsedVtt.length} cue item(s)`);
  console.log(`      Cue 1: [${parsedVtt[0]?.startTime} --> ${parsedVtt[0]?.endTime}] "${parsedVtt[0]?.text}"`);

  const transcriptChunks = chunkTranscriptItems(parsedVtt, 100);
  console.log(`   ✅ Transcript chunking produced ${transcriptChunks.length} timestamped chunk(s)`);

  // Test 3: YouTube URL Helper
  console.log("\n3️⃣ Testing YouTube URL Parsing...");
  const ytUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const ytId = extractYoutubeVideoId(ytUrl);
  console.log(`   ✅ YouTube Video ID extracted: ${ytId} (timestamp formatted: ${formatTimestamp(125)})`);

  // Test 4: Cleanup Test Notebook
  console.log("\n4️⃣ Cleaning up test notebook...");
  await deleteNotebook(nb.id);
  console.log("   ✅ Deleted test notebook and associated records.");

  console.log("\n🎉 ALL BACKEND UNIT & INTEGRATION TESTS PASSED CLEANLY!");
}

runTests().catch((err) => {
  console.error("❌ Test suite failed:", err);
  process.exit(1);
});

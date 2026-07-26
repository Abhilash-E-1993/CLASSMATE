import { config } from "./config.js";
import { safeVectorSearch } from "./qdrant.js";
import { openai, embedTexts } from "./openai.js";
import { getOrCreateConversation, getMessagesForNotebook, saveMessage } from "./db/index.js";

/**
 * Rewrite a user's query into several variants to improve retrieval:
 *  - stepBack:   a broader, more general question (step-back prompting)
 *  - rewritten:  the same query with typos/grammar fixed and made explicit
 *  - subQueries: the query decomposed into 3 focused sub-questions
 */
export async function queryRewriting(query) {
  const completion = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.2,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "query_rewriting",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            stepBack: {
              type: "string",
              description:
                "A broader, higher-level 'step-back' question whose answer gives useful background for the original query.",
            },
            rewritten: {
              type: "string",
              description:
                "The original query with spelling/grammar fixed and made clear and self-contained. Preserve the original intent.",
            },
            subQueries: {
              type: "array",
              description: "Exactly 3 focused sub-questions the original query can be decomposed into.",
              items: { type: "string" },
            },
          },
          required: ["stepBack", "rewritten", "subQueries"],
        },
      },
    },
    messages: [
      {
        role: "system",
        content:
          "You are a query understanding assistant for a retrieval system. " +
          "Given a user's question, produce query variants that help retrieve relevant documents. " +
          "Apply three techniques: (1) step-back prompting -> one broader background question; " +
          "(2) query rewriting -> fix typos/grammar and make the query explicit and self-contained; " +
          "(3) sub-query decomposition -> break the query into exactly 3 focused sub-questions. " +
          "Respond ONLY with the structured JSON.",
      },
      { role: "user", content: query },
    ],
  });

  const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");

  return {
    stepBack: parsed.stepBack ?? "",
    rewritten: parsed.rewritten ?? query,
    subQueries: Array.isArray(parsed.subQueries) ? parsed.subQueries.slice(0, 3) : [],
  };
}

/**
 * HyDE (Hypothetical Document Embeddings): ask model to write a short plausible passage.
 */
export async function hydeDocument(query) {
  const completion = await openai.chat.completions.create({
    model: config.openai.chatModel,
    temperature: 0.3,
    messages: [
      {
        role: "system",
        content:
          "You are an expert writer. Write a concise, factual passage (3-5 sentences) that directly answers " +
          "the user's question, as if it were an excerpt from a relevant reference document. " +
          "Write confidently in a neutral, encyclopedic tone. Do not add disclaimers or say you are unsure.",
      },
      { role: "user", content: query },
    ],
  });

  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/** Search Qdrant (or memory store fallback) for vectors strictly matching notebookId. */
async function searchByVector(vector, notebookId) {
  return safeVectorSearch(config.qdrant.collection, vector, notebookId, config.retrieval.topK);
}

/**
 * Reciprocal Rank Fusion: combine several ranked result lists into one.
 */
function reciprocalRankFusion(rankedLists, k = config.retrieval.rrfK) {
  const fused = new Map();

  for (const { label, hits } of rankedLists) {
    hits.forEach((h, index) => {
      const rank = index + 1; // 1-based
      const contribution = 1 / (k + rank);
      const existing = fused.get(h.id);

      if (existing) {
        existing.rrfScore += contribution;
        existing.bestScore = Math.max(existing.bestScore, h.score);
        existing.matchedBy.push(label);
      } else {
        fused.set(h.id, {
          id: h.id,
          text: h.payload?.text ?? "",
          sourceId: h.payload?.sourceId ?? null,
          sourceType: h.payload?.sourceType ?? "unknown",
          title: h.payload?.title ?? "Untitled Source",
          chunkIndex: h.payload?.chunkIndex ?? null,
          page: h.payload?.page ?? null,
          startTime: h.payload?.startTime ?? null,
          endTime: h.payload?.endTime ?? null,
          url: h.payload?.url ?? null,
          bestScore: h.score,
          rrfScore: contribution,
          matchedBy: [label],
        });
      }
    });
  }

  return [...fused.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}

/**
 * Multi-query retrieval isolated to notebookId.
 */
export async function retrieveChunks(query, notebookId) {
  const [{ stepBack, rewritten, subQueries }, hyde] = await Promise.all([
    queryRewriting(query),
    hydeDocument(query),
  ]);

  const labelled = [
    { label: "rewritten", text: rewritten },
    { label: "stepBack", text: stepBack },
    { label: "hyde", text: hyde },
    ...subQueries.map((q, i) => ({ label: `subQuery${i + 1}`, text: q })),
  ].filter((q) => typeof q.text === "string" && q.text.trim().length > 0);

  const vectors = await embedTexts(labelled.map((q) => q.text));
  const resultsPerQuery = await Promise.all(vectors.map((v) => searchByVector(v, notebookId)));

  const rankedLists = labelled.map((q, i) => ({ label: q.label, hits: resultsPerQuery[i] }));
  const fused = reciprocalRankFusion(rankedLists);
  const chunks = fused.slice(0, config.retrieval.finalK);

  return {
    queries: { original: query, rewritten, stepBack, hyde, subQueries },
    chunks,
  };
}

/**
 * Mini-Evaluator model: Rate output quality out of 10 for accuracy, groundedness, and completeness.
 * @param {{ query: string, context: string, answer: string }} param0
 * @returns {Promise<{ score: number, reasoning: string, feedback: string }>}
 */
export async function evaluateResponse({ query, context, answer }) {
  try {
    const completion = await openai.chat.completions.create({
      model: config.openai.chatModel,
      temperature: 0.1,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "response_evaluation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              score: {
                type: "integer",
                description: "Overall response quality score from 0 to 10.",
              },
              reasoning: {
                type: "string",
                description: "Brief justification for the score.",
              },
              feedback: {
                type: "string",
                description: "Specific feedback on how to fix issues if score < 7.",
              },
            },
            required: ["score", "reasoning", "feedback"],
          },
        },
      },
      messages: [
        {
          role: "system",
          content:
            "You are a strict quality control evaluator for a RAG question-answering system.\n" +
            "Evaluate the ASSISTANT ANSWER against the USER QUESTION and CONTEXT.\n" +
            "Criteria:\n" +
            "1. Groundedness (0-4 pts): Does the answer strictly adhere to facts in the CONTEXT without ungrounded claims?\n" +
            "2. Completeness (0-3 pts): Does the answer fully address the user's question?\n" +
            "3. Citation Accuracy (0-3 pts): Are citations like [1], [2] used accurately to support facts?\n" +
            "Total Score = sum of points (0 to 10).\n" +
            "If score < 7, provide specific instructions on what must be corrected.",
        },
        {
          role: "user",
          content: `USER QUESTION:\n${query}\n\nCONTEXT SOURCES:\n${context}\n\nASSISTANT ANSWER:\n${answer}`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
    const score = typeof parsed.score === "number" ? Math.min(10, Math.max(0, parsed.score)) : 8;
    return {
      score,
      reasoning: parsed.reasoning || "Evaluated response quality",
      feedback: parsed.feedback || "",
    };
  } catch (err) {
    console.error("Evaluation model failed, defaulting to score 8:", err.message);
    return { score: 8, reasoning: "Evaluator bypass on error", feedback: "" };
  }
}

/**
 * RAG Chat pipeline with notebook filtering, conversation memory & inline citations.
 * @param {{ notebookId: string, query: string }} param0
 */
export async function answerChatQuery({ notebookId, query }) {
  // Get or create conversation for this notebook
  const conv = await getOrCreateConversation(notebookId);

  // Save user message to database
  await saveMessage({
    conversationId: conv.id,
    role: "user",
    content: query,
  });

  // Fetch recent conversation history for multi-turn context awareness
  const pastMessages = await getMessagesForNotebook(notebookId, 10);

  // Retrieve relevant chunks isolated strictly to notebookId
  const { queries, chunks } = await retrieveChunks(query, notebookId);

  if (chunks.length === 0) {
    const fallbackAnswer = "I couldn't find any relevant information in the uploaded sources for this notebook.";
    const savedAssistantMsg = await saveMessage({
      conversationId: conv.id,
      role: "assistant",
      content: fallbackAnswer,
      citations: [],
    });

    return {
      conversationId: conv.id,
      messageId: savedAssistantMsg.id,
      query,
      answer: fallbackAnswer,
      citations: [],
      qualityScore: 10,
      evalAttempts: 1,
      queriesUsed: queries,
    };
  }

  // Map retrieved chunks to numbered citations [1], [2], ...
  const citations = chunks.map((c, i) => ({
    id: i + 1,
    citationTag: `[${i + 1}]`,
    sourceId: c.sourceId,
    sourceType: c.sourceType,
    title: c.title,
    page: c.page,
    startTime: c.startTime,
    endTime: c.endTime,
    url: c.url,
    snippet: c.text,
  }));

  // Build grounded context text with citation tags
  const context = citations
    .map((c) => {
      let metaStr = `[${c.id}] Source: "${c.title}" (${c.sourceType})`;
      if (c.page) metaStr += `, Page ${c.page}`;
      if (c.startTime) metaStr += `, Time ${c.startTime}-${c.endTime || ""}`;
      if (c.url) metaStr += `, URL: ${c.url}`;
      return `${metaStr}\nContent: ${c.snippet}`;
    })
    .join("\n\n");

  // Format conversation history for LLM
  const historyForLlm = pastMessages.slice(0, -1).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const systemMessage =
    "You are an intelligent NotebookLM assistant. Answer the user's question accurately using ONLY the provided sources.\n" +
    "IMPORTANT CITATION & RELEVANCE INSTRUCTIONS:\n" +
    "- Sources are ordered strictly by relevance: [1] is the most relevant, followed by [2], [3], etc.\n" +
    "- PREFER relying on and citing the most relevant top sources [1], [2] first before secondary sources.\n" +
    "- Include inline numeric citations like [1], [2] whenever referencing facts from the sources.\n" +
    "- Match each citation tag [N] strictly to the corresponding numbered source provided in the context.\n" +
    "- Format your answer with clean Markdown formatting (bold text, bullet points, headers) for maximum readability.\n" +
    "- If the answer cannot be found in the context, explicitly state that you don't know based on current sources.\n" +
    "- Be concise, direct, and factual.";

  // Self-Correction Evaluator Loop (Max 3 attempts if score < 7)
  const maxAttempts = 3;
  let attempt = 1;
  let currentAnswer = "";
  let finalEval = { score: 0, reasoning: "", feedback: "" };
  const feedbackHistory = [];

  while (attempt <= maxAttempts) {
    const feedbackPrompt =
      feedbackHistory.length > 0
        ? `\n\nPREVIOUS ATTEMPT FEEDBACK (Fix these issues to achieve a quality score of 10):\n` +
          feedbackHistory.map((f, i) => `Attempt ${i + 1} Feedback: ${f}`).join("\n")
        : "";

    const completion = await openai.chat.completions.create({
      model: config.openai.chatModel,
      temperature: 0.2,
      messages: [
        { role: "system", content: systemMessage },
        ...historyForLlm,
        {
          role: "user",
          content: `SOURCES CONTEXT:\n${context}\n\nUSER QUESTION: ${query}${feedbackPrompt}`,
        },
      ],
    });

    currentAnswer = completion.choices[0]?.message?.content?.trim() ?? "";

    // Rate response quality out of 10 using mini evaluator model
    finalEval = await evaluateResponse({
      query,
      context,
      answer: currentAnswer,
    });

    console.log(
      `🧠 [Self-Correction Evaluator] Iteration ${attempt}/${maxAttempts} -> Quality Score: ${finalEval.score}/10 | ${finalEval.reasoning}`
    );

    // If quality score is >= 7, answer meets high quality standard! Break loop.
    if (finalEval.score >= 7) {
      break;
    }

    // If score < 7 and attempt < maxAttempts, append feedback and retry!
    feedbackHistory.push(finalEval.feedback);
    attempt++;
  }

  const finalAttemptsUsed = Math.min(attempt, maxAttempts);

  // Attach quality score and evaluation metadata to citations payload
  const resultCitations = citations.map((c) => ({
    ...c,
    qualityScore: finalEval.score,
    evalAttempts: finalAttemptsUsed,
    evalReasoning: finalEval.reasoning,
  }));

  // Save assistant message with citations & evaluation metadata into database
  const savedAssistantMsg = await saveMessage({
    conversationId: conv.id,
    role: "assistant",
    content: currentAnswer,
    citations: resultCitations,
  });

  return {
    conversationId: conv.id,
    messageId: savedAssistantMsg.id,
    query,
    answer: currentAnswer,
    citations: resultCitations,
    qualityScore: finalEval.score,
    evalAttempts: finalAttemptsUsed,
    evalReasoning: finalEval.reasoning,
    queriesUsed: queries,
  };
}

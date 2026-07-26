import axios from "axios";

const isLocal =
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const RENDER_BACKEND_URL = "https://classmate-9kmj.onrender.com";

let rawApiUrl = import.meta.env.VITE_API_URL;
let API_BASE_URL = RENDER_BACKEND_URL;

if (isLocal) {
  API_BASE_URL = rawApiUrl || "/api";
} else if (rawApiUrl && rawApiUrl !== "/api" && !rawApiUrl.startsWith("/")) {
  API_BASE_URL = rawApiUrl;
} else {
  API_BASE_URL = RENDER_BACKEND_URL;
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export function setAuthToken(token) {
  if (token) {
    apiClient.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common["Authorization"];
  }
}

// --- Notebook APIs ---
export async function getNotebooks() {
  const response = await apiClient.get("/notebooks");
  return response.data;
}

export async function getNotebook(id) {
  const response = await apiClient.get(`/notebooks/${id}`);
  return response.data;
}

export async function createNotebook(name) {
  const response = await apiClient.post("/notebooks", { name });
  return response.data;
}

export async function deleteNotebook(id) {
  const response = await apiClient.delete(`/notebooks/${id}`);
  return response.data;
}

export async function getNotebookSources(notebookId) {
  const response = await apiClient.get(`/notebooks/${notebookId}/sources`);
  return response.data;
}

// --- Source APIs ---
export async function uploadPdfSource(notebookId, file) {
  const formData = new FormData();
  formData.append("notebookId", notebookId);
  formData.append("file", file);

  const response = await apiClient.post("/sources/upload", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
}

export async function addTextSource(notebookId, title, text) {
  const response = await apiClient.post("/sources/text", { notebookId, title, text });
  return response.data;
}

export async function addUrlSource(notebookId, title, url) {
  const response = await apiClient.post("/sources/url", { notebookId, title, url });
  return response.data;
}

export async function addYoutubeSource(notebookId, title, url) {
  const response = await apiClient.post("/sources/youtube", { notebookId, title, url });
  return response.data;
}

export async function addTranscriptSource(notebookId, title, content, file = null) {
  if (file) {
    const formData = new FormData();
    formData.append("notebookId", notebookId);
    if (title) formData.append("title", title);
    formData.append("file", file);
    const response = await apiClient.post("/sources/transcript", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  }

  const response = await apiClient.post("/sources/transcript", { notebookId, title, content });
  return response.data;
}

export async function getSource(id) {
  const response = await apiClient.get(`/sources/${id}`);
  return response.data;
}

export async function deleteSource(id) {
  const response = await apiClient.delete(`/sources/${id}`);
  return response.data;
}

export async function reindexSource(id) {
  const response = await apiClient.post(`/sources/${id}/reindex`);
  return response.data;
}

// --- Chat APIs ---
export async function sendChatQuery(notebookId, query) {
  const response = await apiClient.post("/chat", { notebookId, query });
  return response.data;
}

export async function getChatHistory(notebookId) {
  const response = await apiClient.get(`/chat/history/${notebookId}`);
  return response.data;
}

// --- Job Polling API ---
export async function getJobStatus(jobId) {
  const response = await apiClient.get(`/jobs/${jobId}`);
  return response.data;
}

/**
 * Poll job status repeatedly until completed or failed.
 * @param {string} jobId
 * @param {number} intervalMs
 * @param {number} maxAttempts
 */
export async function pollJobUntilComplete(jobId, intervalMs = 1500, maxAttempts = 60) {
  if (!jobId) return null;
  let attempts = 0;

  while (attempts < maxAttempts) {
    const job = await getJobStatus(jobId);
    if (job.status === "completed") {
      return job.result;
    }
    if (job.status === "failed") {
      throw new Error(job.error || "Job failed");
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
  }

  throw new Error("Job polling timed out");
}

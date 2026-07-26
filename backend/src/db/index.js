import sqlite3 from "sqlite3";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { config } from "../config.js";

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Enable verbose mode in dev if needed
const sqlite = sqlite3.verbose();
const db = new sqlite.Database(config.dbPath);

// Enable foreign keys pragma
db.run("PRAGMA foreign_keys = ON;");

// Helper function to run SQL queries as Promises
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

// Initialize Database Schema
export async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS notebooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS sources (
      id TEXT PRIMARY KEY,
      notebookId TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      filePath TEXT,
      url TEXT,
      chunkCount INTEGER DEFAULT 0,
      errorMessage TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (notebookId) REFERENCES notebooks(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      notebookId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (notebookId) REFERENCES notebooks(id) ON DELETE CASCADE
    );
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      citations TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

// --- Notebook Operations ---
export async function createNotebook(name) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await run(
    `INSERT INTO notebooks (id, name, createdAt, updatedAt) VALUES (?, ?, ?, ?)`,
    [id, name, now, now]
  );
  return getNotebook(id);
}

export async function getNotebook(id) {
  const notebook = await get(`SELECT * FROM notebooks WHERE id = ?`, [id]);
  if (!notebook) return null;
  const sources = await getSourcesForNotebook(id);
  return { ...notebook, sourcesCount: sources.length };
}

export async function listNotebooks() {
  const rows = await all(`SELECT * FROM notebooks ORDER BY updatedAt DESC`);
  const result = [];
  for (const row of rows) {
    const sources = await getSourcesForNotebook(row.id);
    result.push({ ...row, sourcesCount: sources.length });
  }
  return result;
}

export async function deleteNotebook(id) {
  await run(`DELETE FROM messages WHERE conversationId IN (SELECT id FROM conversations WHERE notebookId = ?)`, [id]);
  await run(`DELETE FROM conversations WHERE notebookId = ?`, [id]);
  await run(`DELETE FROM sources WHERE notebookId = ?`, [id]);
  await run(`DELETE FROM notebooks WHERE id = ?`, [id]);
}

// --- Source Operations ---
export async function createSource({ notebookId, type, title, filePath = null, url = null }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const status = "uploading";
  await run(
    `INSERT INTO sources (id, notebookId, type, title, status, filePath, url, chunkCount, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [id, notebookId, type, title, status, filePath, url, now, now]
  );
  return getSource(id);
}

export async function getSource(id) {
  return get(`SELECT * FROM sources WHERE id = ?`, [id]);
}

export async function getSourcesForNotebook(notebookId) {
  return all(`SELECT * FROM sources WHERE notebookId = ? ORDER BY createdAt DESC`, [notebookId]);
}

export async function updateSourceStatus(id, status, { chunkCount, errorMessage } = {}) {
  const now = new Date().toISOString();
  let sql = `UPDATE sources SET status = ?, updatedAt = ?`;
  const params = [status, now];

  if (chunkCount !== undefined) {
    sql += `, chunkCount = ?`;
    params.push(chunkCount);
  }
  if (errorMessage !== undefined) {
    sql += `, errorMessage = ?`;
    params.push(errorMessage);
  }
  sql += ` WHERE id = ?`;
  params.push(id);

  await run(sql, params);
  return getSource(id);
}

export async function deleteSource(id) {
  await run(`DELETE FROM sources WHERE id = ?`, [id]);
}

// --- Conversation & Message Operations ---
export async function getOrCreateConversation(notebookId) {
  let conv = await get(`SELECT * FROM conversations WHERE notebookId = ? ORDER BY createdAt ASC LIMIT 1`, [notebookId]);
  if (!conv) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await run(`INSERT INTO conversations (id, notebookId, createdAt, updatedAt) VALUES (?, ?, ?, ?)`, [id, notebookId, now, now]);
    conv = await get(`SELECT * FROM conversations WHERE id = ?`, [id]);
  }
  return conv;
}

export async function saveMessage({ conversationId, role, content, citations = null }) {
  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const citationsJson = citations ? JSON.stringify(citations) : null;
  await run(
    `INSERT INTO messages (id, conversationId, role, content, citations, timestamp) VALUES (?, ?, ?, ?, ?, ?)`,
    [id, conversationId, role, content, citationsJson, timestamp]
  );
  // Update conversation timestamp
  await run(`UPDATE conversations SET updatedAt = ? WHERE id = ?`, [timestamp, conversationId]);
  return { id, conversationId, role, content, citations, timestamp };
}

export async function getMessagesForNotebook(notebookId, limit = 20) {
  const conv = await getOrCreateConversation(notebookId);
  const rows = await all(
    `SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC LIMIT ?`,
    [conv.id, limit]
  );
  return rows.map((r) => ({
    ...r,
    citations: r.citations ? JSON.parse(r.citations) : null,
  }));
}

// Auto-initialize tables on module load
initDb().catch((err) => console.error("Failed to initialize SQLite database:", err));

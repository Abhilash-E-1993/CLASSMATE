# NotebookLM Clone – Advanced Multi-Source RAG Workspace

A production-grade NotebookLM clone featuring an **Advanced RAG retrieval engine** (Query Rewriting, Step-Back Prompting, Sub-Query Decomposition, HyDE, Multi-Vector Search in Qdrant, and Reciprocal Rank Fusion) coupled with a modern **React + Vite Frontend**.

---

## 📁 Repository Structure

```
advance-rag-pipeline-main/
├── backend/
│   ├── src/
│   │   ├── db/                 # SQLite database storage (Notebooks, Sources, Conversations, Messages)
│   │   ├── extractors/         # PDF, Web Scraping, YouTube Timestamps, VTT/Transcript parsers
│   │   ├── config.js           # Central configuration
│   │   ├── index.js            # Express REST API server
│   │   ├── indexer.js          # Multi-source vector ingestion & metadata enrichment
│   │   ├── qdrant.js           # Qdrant client & notebookId vector isolation filters
│   │   ├── queue.js            # BullMQ task queues (source-indexing & chat-query)
│   │   ├── retriever.js        # Advanced multi-query RAG engine & citation generator
│   │   └── worker.js           # Asynchronous background worker
│   ├── data/                   # Auto-created SQLite database file (app.db)
│   ├── uploads/                # File storage for uploaded PDFs and transcripts
│   ├── docker-compose.yml      # Infrastructure (Redis + Qdrant)
│   ├── Advance_RAG_Pipeline.postman_collection.json # API Postman collection
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── api/                # Axios client & job polling helpers
    │   ├── components/         # Landing, Sidebar, Modals, Chat Stream, Citation Inspector
    │   ├── context/            # React Context for active notebook & workspace state
    │   ├── pages/              # Landing Page & Dashboard Page
    │   ├── App.jsx
    │   └── index.css           # Tailwind CSS & custom design system
    ├── package.json
    └── vite.config.js          # Vite config with API proxy to backend:8000
```

---

## 🚀 How to Run the Application

### 1. Prerequisites
- Node.js (v18+)
- Docker Desktop (for Qdrant & Redis)

### 2. Start Backend Infrastructure & Server

```bash
# Navigate to backend directory
cd backend

# 1. Start Qdrant and Redis containers
npm run services:up

# 2. Start Express API Server (Terminal 1)
npm run start

# 3. Start Background Worker (Terminal 2)
npm run worker
```

### 3. Start Frontend Dev Server

```bash
# Open a new terminal and navigate to frontend directory
cd frontend

# Install dependencies (if not already installed)
npm install

# Start Vite React Dev Server
npm run dev
```

Open your browser at **`http://localhost:5173`** to access the NotebookLM Clone application!

---

## ✨ Features Implemented

1. **Multi-Source Ingestion**:
   - 📄 **PDF Documents**: Page number preservation & text extraction.
   - 📝 **Plain Text**: Direct pasting for quick notes.
   - 🌐 **Website URLs**: Clean article extraction (stripping navbars, ads, footers).
   - 🎥 **YouTube Videos**: Automated transcript extraction with start/end timestamps.
   - 📜 **VTT Transcripts**: Full `.vtt` file & transcript parsing with timestamp mapping.
2. **Strict Workspace Isolation**:
   - Each notebook is a completely isolated workspace.
   - Qdrant payload filters ensure vector searches never leak data between notebooks.
3. **Advanced Retrieval Engine (100% Preserved)**:
   - Query Rewriting, Step-Back Prompting, Sub-Query Decomposition, HyDE (Hypothetical Document Embeddings), and Reciprocal Rank Fusion (RRF).
4. **Citation Grounding**:
   - Answers include numeric tags `[1]`, `[2]`.
   - Clicking a citation opens the **Citation Inspector Drawer** with exact pages, video timestamp jump links, web URLs, and snippet highlights.

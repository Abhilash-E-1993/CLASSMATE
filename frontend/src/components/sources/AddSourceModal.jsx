import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Globe, Video, FileCode, AlignLeft, Upload, Link, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useNotebook } from "../../context/NotebookContext";
import * as api from "../../api/client";

export function AddSourceModal() {
  const { isAddSourceOpen, setIsAddSourceOpen, activeNotebookId, fetchSources, fetchNotebooks } = useNotebook();

  const [activeTab, setActiveTab] = useState("pdf"); // "pdf" | "text" | "url" | "youtube" | "transcript"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Form states
  const [pdfFile, setPdfFile] = useState(null);
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [webTitle, setWebTitle] = useState("");
  const [ytUrl, setYtUrl] = useState("");
  const [ytTitle, setYtTitle] = useState("");
  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptContent, setTranscriptContent] = useState("");
  const [transcriptFile, setTranscriptFile] = useState(null);

  if (!isAddSourceOpen || !activeNotebookId) return null;

  const resetForms = () => {
    setPdfFile(null);
    setTextTitle("");
    setTextContent("");
    setWebUrl("");
    setWebTitle("");
    setYtUrl("");
    setYtTitle("");
    setTranscriptTitle("");
    setTranscriptContent("");
    setTranscriptFile(null);
    setError("");
  };

  const handleClose = () => {
    resetForms();
    setIsAddSourceOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (activeTab === "pdf") {
        if (!pdfFile) throw new Error("Please select a PDF file");
        await api.uploadPdfSource(activeNotebookId, pdfFile);
      } else if (activeTab === "text") {
        if (!textContent.trim()) throw new Error("Please enter plain text content");
        await api.addTextSource(activeNotebookId, textTitle.trim(), textContent.trim());
      } else if (activeTab === "url") {
        if (!webUrl.trim()) throw new Error("Please enter a valid website URL");
        await api.addUrlSource(activeNotebookId, webTitle.trim(), webUrl.trim());
      } else if (activeTab === "youtube") {
        if (!ytUrl.trim()) throw new Error("Please enter a YouTube video URL");
        await api.addYoutubeSource(activeNotebookId, ytTitle.trim(), ytUrl.trim());
      } else if (activeTab === "transcript") {
        if (!transcriptContent.trim() && !transcriptFile) {
          throw new Error("Please provide transcript content or upload a VTT file");
        }
        await api.addTranscriptSource(activeNotebookId, transcriptTitle.trim(), transcriptContent, transcriptFile);
      }

      await fetchSources();
      await fetchNotebooks();
      handleClose();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message || "Failed to add source");
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "pdf", label: "PDF File", icon: <FileText className="w-4 h-4 text-indigo-400" /> },
    { id: "text", label: "Plain Text", icon: <AlignLeft className="w-4 h-4 text-teal-400" /> },
    { id: "url", label: "Website URL", icon: <Globe className="w-4 h-4 text-purple-400" /> },
    { id: "youtube", label: "YouTube Video", icon: <Video className="w-4 h-4 text-red-400" /> },
    { id: "transcript", label: "VTT / Transcript", icon: <FileCode className="w-4 h-4 text-amber-400" /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]"
        >
          {/* Top accent border */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400" />

          {/* Header */}
          <div className="p-5 border-b border-gray-800/80 flex items-center justify-between bg-gray-950">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white leading-snug">Add Knowledge Source</h3>
                <p className="text-[11px] text-gray-400">Index documents into your isolated notebook RAG workspace</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Source Format Tabs */}
          <div className="flex items-center gap-1.5 p-2 bg-gray-950 border-b border-gray-800/80 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError("");
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  activeTab === tab.id
                    ? "bg-indigo-600/15 border-indigo-500/40 text-white shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-900 border-transparent"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mx-5 mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Tab Form Content */}
          <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4">
            {/* TAB 1: PDF */}
            {activeTab === "pdf" && (
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2 font-mono">
                  Upload PDF Document
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    if (e.dataTransfer.files?.[0]) {
                      setPdfFile(e.dataTransfer.files[0]);
                    }
                  }}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                    dragOver
                      ? "border-indigo-500 bg-indigo-600/10 scale-[1.01]"
                      : pdfFile
                      ? "border-emerald-500/50 bg-emerald-500/5"
                      : "border-gray-800 hover:border-indigo-500/50 bg-gray-950/60"
                  }`}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(e) => setPdfFile(e.target.files[0] || null)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  {pdfFile ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <p className="text-sm font-bold text-white">{pdfFile.name}</p>
                      <p className="text-xs text-emerald-400 font-mono">
                        {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to index
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <Upload className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-gray-200">
                        Click or drag & drop PDF file here
                      </p>
                      <p className="text-xs text-gray-500">Supports PDF documents up to 50 MB</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: PLAIN TEXT */}
            {activeTab === "text" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Source Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="e.g. Project Architecture Overview"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Text Content
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste plain text, research notes, code documentation..."
                    className="w-full px-4 py-3 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
              </>
            )}

            {/* TAB 3: WEBSITE URL */}
            {activeTab === "url" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Article Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={webTitle}
                    onChange={(e) => setWebTitle(e.target.value)}
                    placeholder="e.g. Attention Is All You Need Paper Summary"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Website URL
                  </label>
                  <div className="relative">
                    <Link className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      required
                      value={webUrl}
                      onChange={(e) => setWebUrl(e.target.value)}
                      placeholder="https://example.com/article"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* TAB 4: YOUTUBE VIDEO */}
            {activeTab === "youtube" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Video Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={ytTitle}
                    onChange={(e) => setYtTitle(e.target.value)}
                    placeholder="e.g. Deep Learning Lecture 1"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    YouTube Video URL
                  </label>
                  <div className="relative">
                    <Video className="w-4 h-4 text-red-400 absolute left-3.5 top-3" />
                    <input
                      type="url"
                      required
                      value={ytUrl}
                      onChange={(e) => setYtUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500 mt-1.5">
                    Transcript start/end timestamps will be automatically indexed and linked in citations.
                  </p>
                </div>
              </>
            )}

            {/* TAB 5: VTT / TRANSCRIPT */}
            {activeTab === "transcript" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Transcript Title
                  </label>
                  <input
                    type="text"
                    value={transcriptTitle}
                    onChange={(e) => setTranscriptTitle(e.target.value)}
                    placeholder="e.g. Podcast Episode Transcript"
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5 font-mono">
                    Paste VTT / Raw Transcript Content
                  </label>
                  <textarea
                    rows={4}
                    value={transcriptContent}
                    onChange={(e) => setTranscriptContent(e.target.value)}
                    placeholder="Paste WEBVTT content or transcript text..."
                    className="w-full px-4 py-2.5 rounded-xl bg-gray-950 border border-gray-800 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <span className="text-[11px] font-mono text-gray-400 block mb-1">Or upload .vtt file</span>
                  <input
                    type="file"
                    accept=".vtt,.txt"
                    onChange={(e) => setTranscriptFile(e.target.files[0] || null)}
                    className="text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-indigo-400 hover:file:bg-gray-700"
                  />
                </div>
              </>
            )}

            {/* Footer Submit Button */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Indexing Vectors...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Add Source</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Globe, Video, AlignLeft, FileCode, ExternalLink, Layers, CheckCircle2, Clock } from "lucide-react";

export function SourcePreviewModal({ source, isOpen, onClose }) {
  if (!isOpen || !source) return null;

  const getSourceIcon = () => {
    switch (source.type) {
      case "pdf":
        return <FileText className="w-5 h-5 text-indigo-400" />;
      case "website":
        return <Globe className="w-5 h-5 text-purple-400" />;
      case "youtube":
        return <Video className="w-5 h-5 text-red-400" />;
      case "text":
        return <AlignLeft className="w-5 h-5 text-teal-400" />;
      case "transcript":
        return <FileCode className="w-5 h-5 text-amber-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        >
          {/* Top glow bar */}
          <div className="h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-400" />

          {/* Modal Header */}
          <div className="p-5 border-b border-gray-800/80 flex items-center justify-between bg-gray-950">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center shadow-inner">
                {getSourceIcon()}
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white leading-snug truncate max-w-md">
                  {source.title}
                </h3>
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">
                  {source.type} Knowledge Source
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Metadata Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80">
                <span className="text-[10px] uppercase font-semibold text-gray-500 font-mono block mb-1">Status</span>
                <span className={`inline-flex items-center gap-1 text-xs font-bold ${source.status === "ready" ? "text-emerald-400" : source.status === "error" ? "text-red-400" : "text-amber-400"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span className="capitalize">{source.status}</span>
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80">
                <span className="text-[10px] uppercase font-semibold text-gray-500 font-mono block mb-1">Chunks Indexed</span>
                <span className="inline-flex items-center gap-1 text-xs font-bold text-indigo-300 font-mono">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  {source.chunkCount || 0} chunks
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80 col-span-2 sm:col-span-1">
                <span className="text-[10px] uppercase font-semibold text-gray-500 font-mono block mb-1">Indexed Date</span>
                <span className="inline-flex items-center gap-1 text-xs text-gray-300 font-mono">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {new Date(source.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {source.errorMessage && (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-xs text-red-300 space-y-1">
                <span className="font-mono font-bold uppercase tracking-wider block text-red-400">Indexing Failure Reason</span>
                <p className="font-mono text-[11px] leading-relaxed break-words">{source.errorMessage}</p>
              </div>
            )}

            {/* External Links / Location */}
            {source.url && (
              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80 space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-gray-500 font-mono block">Original Source URL</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 underline font-mono break-all"
                >
                  <span>{source.url}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            )}

            {source.filePath && (
              <div className="p-3.5 rounded-xl bg-gray-950 border border-gray-800/80 space-y-1">
                <span className="text-[10px] uppercase font-semibold text-gray-500 font-mono block">Stored File Path</span>
                <span className="text-xs text-gray-300 font-mono break-all">{source.filePath}</span>
              </div>
            )}

            {/* Ingestion Info Box */}
            <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-gray-300 leading-relaxed">
              <h4 className="font-bold text-indigo-300 mb-1">Knowledge Ingestion Strategy</h4>
              <p>
                This document is split into 1000-character chunks with 200-character overlap. Vectors are embedded using 
                <strong> OpenAI text-embedding-3-small (1536 dims)</strong> and indexed into Qdrant under notebook isolation filters.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-800 bg-gray-950 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

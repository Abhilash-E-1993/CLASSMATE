import React, { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Globe, Video, AlignLeft, FileCode, Trash2, RefreshCw, AlertCircle, CheckCircle2, Eye, Loader2 } from "lucide-react";
import { useNotebook } from "../../context/NotebookContext";
import * as api from "../../api/client";
import { SourcePreviewModal } from "./SourcePreviewModal";

export function SourceCard({ source }) {
  const { handleDeleteSource, fetchSources } = useNotebook();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const getSourceIcon = () => {
    switch (source.type) {
      case "pdf":
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case "website":
        return <Globe className="w-4 h-4 text-purple-400" />;
      case "youtube":
        return <Video className="w-4 h-4 text-red-400" />;
      case "text":
        return <AlignLeft className="w-4 h-4 text-teal-400" />;
      case "transcript":
        return <FileCode className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = () => {
    switch (source.status) {
      case "ready":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-mono font-medium">
            <CheckCircle2 className="w-3 h-3" />
            <span>Ready ({source.chunkCount || 0} chunks)</span>
          </span>
        );
      case "indexing":
      case "uploading":
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-mono font-medium animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            <span className="capitalize">{source.status}...</span>
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono font-medium" title={source.errorMessage || "Indexing failed"}>
            <AlertCircle className="w-3 h-3" />
            <span>Indexing Error</span>
          </span>
        );
      default:
        return null;
    }
  };

  const onDelete = async (e) => {
    e.stopPropagation();
    if (window.confirm(`Delete source "${source.title}"?`)) {
      setIsDeleting(true);
      await handleDeleteSource(source.id);
      setIsDeleting(false);
    }
  };

  const onReindex = async (e) => {
    e.stopPropagation();
    try {
      setIsReindexing(true);
      await api.reindexSource(source.id);
      await fetchSources();
    } catch (err) {
      console.error(err);
    } finally {
      setIsReindexing(false);
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -1 }}
        onClick={() => setIsPreviewOpen(true)}
        className="p-3.5 rounded-2xl glass-card transition-all hover:bg-gray-900 border border-gray-800/80 hover:border-indigo-500/30 flex items-center justify-between group cursor-pointer shadow-sm"
      >
        <div className="flex items-center gap-3 min-w-0 pr-2">
          <div className="w-8 h-8 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0 shadow-inner">
            {getSourceIcon()}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate leading-snug group-hover:text-indigo-300 transition-colors">
              {source.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              {getStatusBadge()}
              <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">
                {source.type}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsPreviewOpen(true);
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
            title="Inspect Source Metadata"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onReindex}
            disabled={isReindexing || source.status === "indexing"}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-400 hover:bg-gray-800 transition-colors disabled:opacity-30 cursor-pointer"
            title="Re-index Vectors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors disabled:opacity-30 cursor-pointer"
            title="Delete Source"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Preview Modal */}
      <SourcePreviewModal
        source={source}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
}

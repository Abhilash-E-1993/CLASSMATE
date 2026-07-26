import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, FileText, Video, Globe, AlignLeft, FileCode, Clock, BookOpen, Copy, Check } from "lucide-react";
import { useNotebook } from "../../context/NotebookContext";

export function CitationInspectorDrawer() {
  const { activeCitation, setActiveCitation } = useNotebook();
  const [snippetCopied, setSnippetCopied] = useState(false);

  if (!activeCitation) return null;

  const handleCopySnippet = () => {
    if (activeCitation.snippet) {
      navigator.clipboard.writeText(activeCitation.snippet);
      setSnippetCopied(true);
      setTimeout(() => setSnippetCopied(false), 2000);
    }
  };

  const getSourceIcon = (type) => {
    switch (type) {
      case "pdf":
        return <FileText className="w-4 h-4 text-indigo-400" />;
      case "youtube":
        return <Video className="w-4 h-4 text-red-400" />;
      case "website":
        return <Globe className="w-4 h-4 text-purple-400" />;
      case "text":
        return <AlignLeft className="w-4 h-4 text-teal-400" />;
      case "transcript":
        return <FileCode className="w-4 h-4 text-amber-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceTypeLabel = (type) => {
    switch (type) {
      case "pdf":
        return "PDF Document";
      case "youtube":
        return "YouTube Video";
      case "website":
        return "Web Article";
      case "text":
        return "Plain Text";
      case "transcript":
        return "Transcript";
      default:
        return "Knowledge Source";
    }
  };

  const getYoutubeLinkWithTime = () => {
    if (!activeCitation.url || activeCitation.sourceType !== "youtube") return null;
    let url = activeCitation.url;
    if (activeCitation.startTime) {
      const parts = activeCitation.startTime.split(":").map(Number);
      let totalSec = 0;
      if (parts.length === 3) totalSec = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) totalSec = parts[0] * 60 + parts[1];
      const sep = url.includes("?") ? "&" : "?";
      url = `${url}${sep}t=${totalSec}s`;
    }
    return url;
  };

  const youtubeJumpUrl = getYoutubeLinkWithTime();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden pointer-events-none">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setActiveCitation(null)}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs pointer-events-auto"
        />

        {/* Drawer Panel */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="absolute inset-y-0 right-0 w-full max-w-md bg-gray-950 border-l border-gray-800/80 shadow-2xl flex flex-col pointer-events-auto"
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-800/80 flex items-center justify-between bg-gray-950">
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 font-mono text-xs font-bold">
                Citation [{activeCitation.id}]
              </span>
              <span className="text-xs font-semibold text-gray-400 font-mono">Source Inspector</span>
            </div>
            <button
              onClick={() => setActiveCitation(null)}
              className="text-gray-400 hover:text-white p-1.5 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* Source Meta Card */}
            <div className="p-4 rounded-2xl glass-card border border-gray-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getSourceIcon(activeCitation.sourceType)}
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider font-mono">
                    {getSourceTypeLabel(activeCitation.sourceType)}
                  </span>
                </div>
                {activeCitation.page && (
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 font-mono font-bold">
                    <BookOpen className="w-3 h-3" />
                    Page {activeCitation.page}
                  </span>
                )}
                {activeCitation.startTime && (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 font-mono font-bold">
                    <Clock className="w-3 h-3" />
                    {activeCitation.startTime} - {activeCitation.endTime || ""}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-extrabold text-white leading-snug">
                {activeCitation.title}
              </h3>

              {/* External Links */}
              {youtubeJumpUrl && (
                <a
                  href={youtubeJumpUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>Jump to Video Timestamp ({activeCitation.startTime})</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}

              {activeCitation.url && activeCitation.sourceType === "website" && (
                <a
                  href={activeCitation.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 text-purple-400 text-xs font-semibold transition-all cursor-pointer"
                >
                  <span>Open Web Source</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>

            {/* Snippet Card */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider font-mono">
                  Retrieved Grounded Snippet
                </h4>
                <button
                  onClick={handleCopySnippet}
                  className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  {snippetCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Snippet</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-gray-900 border border-gray-800 text-xs text-gray-200 leading-relaxed font-mono whitespace-pre-wrap select-text shadow-inner">
                {activeCitation.snippet || "No text snippet available."}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

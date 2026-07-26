import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "../components/dashboard/Sidebar";
import { NotebookHeader } from "../components/dashboard/NotebookHeader";
import { SourceCard } from "../components/sources/SourceCard";
import { ChatContainer } from "../components/chat/ChatContainer";
import { AddSourceModal } from "../components/sources/AddSourceModal";
import { CreateNotebookModal } from "../components/dashboard/CreateNotebookModal";
import { CitationInspectorDrawer } from "../components/citations/CitationInspectorDrawer";
import { useNotebook } from "../context/NotebookContext";
import { Plus, FileText, FolderPlus } from "lucide-react";

export function DashboardPage() {
  const { activeNotebook, sources, setIsAddSourceOpen, setIsCreateNotebookOpen } = useNotebook();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {activeNotebook ? (
          <>
            {/* Top Workspace Header */}
            <NotebookHeader />

            {/* Content Area: Left Sources Panel + Right Chat Stream */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left Column: Sources List Panel */}
              <div className="w-80 border-r border-gray-800/80 bg-gray-950/60 flex flex-col h-full overflow-hidden shrink-0 hidden md:flex">
                <div className="p-3.5 border-b border-gray-800/80 flex items-center justify-between bg-gray-950">
                  <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider font-mono">
                    Knowledge Sources ({sources.length})
                  </span>
                  <button
                    onClick={() => setIsAddSourceOpen(true)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold flex items-center gap-1 transition-all border border-indigo-500/30 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {sources.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-500 rounded-2xl border border-dashed border-gray-800 bg-gray-900/30 my-2">
                      <FileText className="w-6 h-6 mx-auto mb-2 text-indigo-400/80" />
                      <p className="font-bold text-gray-300 mb-1">No sources added yet</p>
                      <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
                        Add PDFs, website URLs, YouTube links, or transcripts to start chatting!
                      </p>
                      <button
                        onClick={() => setIsAddSourceOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                      >
                        + Add First Source
                      </button>
                    </div>
                  ) : (
                    <AnimatePresence>
                      {sources.map((src) => (
                        <SourceCard key={src.id} source={src} />
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              </div>

              {/* Right Column: Grounded RAG Chat Container */}
              <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
                <ChatContainer />
              </div>
            </div>
          </>
        ) : (
          /* Empty State when no active notebook */
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex flex-col items-center justify-center text-center p-8"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-600/10">
              <FolderPlus className="w-8 h-8 animate-pulse" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">No Workspace Selected</h2>
            <p className="text-xs sm:text-sm text-gray-400 max-w-sm mb-6 leading-relaxed">
              Create or select a notebook workspace to isolate your multi-source documents and start asking questions.
            </p>
            <button
              onClick={() => setIsCreateNotebookOpen(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Workspace</span>
            </button>
          </motion.div>
        )}
      </div>

      {/* Modals & Drawers */}
      <AddSourceModal />
      <CreateNotebookModal />
      <CitationInspectorDrawer />
    </div>
  );
}

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, Trash2, Home, Sparkles, Search, Layers } from "lucide-react";
import { useNotebook } from "../../context/NotebookContext";

export function Sidebar() {
  const {
    notebooks,
    activeNotebookId,
    setActiveNotebookId,
    setActiveView,
    setIsCreateNotebookOpen,
    handleDeleteNotebook,
  } = useNotebook();

  const [searchQuery, setSearchQuery] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const filteredNotebooks = notebooks.filter((nb) =>
    nb.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onDelete = async (e, id) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this notebook workspace and all its sources?")) {
      setDeletingId(id);
      await handleDeleteNotebook(id);
      setDeletingId(null);
    }
  };

  return (
    <aside className="w-72 bg-gray-950 border-r border-gray-800/80 flex flex-col h-screen shrink-0 relative z-20">
      {/* Brand Header */}
      <div className="p-4 border-b border-gray-800/80 flex items-center justify-between bg-gray-950">
        <div
          onClick={() => setActiveView("landing")}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-white text-sm leading-tight group-hover:text-indigo-400 transition-colors">
              NotebookLM
            </h1>
            <span className="text-[10px] text-gray-500 font-mono">Advanced RAG</span>
          </div>
        </div>

        <button
          onClick={() => setActiveView("landing")}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors cursor-pointer"
          title="Back to Landing Page"
        >
          <Home className="w-4 h-4" />
        </button>
      </div>

      {/* Notebook Search & New Notebook CTA */}
      <div className="p-3 border-b border-gray-800/60 space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-semibold text-gray-400 tracking-wider uppercase font-mono">
            Workspaces ({notebooks.length})
          </span>
          <button
            onClick={() => setIsCreateNotebookOpen(true)}
            className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-xs font-semibold flex items-center gap-1 transition-all border border-indigo-500/30 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>

        {/* Quick Search */}
        {notebooks.length > 3 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workspaces..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-white text-xs placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        )}
      </div>

      {/* Notebook Items List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredNotebooks.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 rounded-xl border border-dashed border-gray-800/80 my-2">
            <BookOpen className="w-5 h-5 mx-auto mb-2 text-gray-600" />
            <p className="font-medium text-gray-400 mb-1">No workspaces found</p>
            <button
              onClick={() => setIsCreateNotebookOpen(true)}
              className="text-indigo-400 hover:text-indigo-300 font-semibold text-[11px] mt-1"
            >
              + Create New Notebook
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {filteredNotebooks.map((nb) => {
              const isActive = nb.id === activeNotebookId;
              return (
                <motion.div
                  key={nb.id}
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -5 }}
                  onClick={() => setActiveNotebookId(nb.id)}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
                    isActive
                      ? "bg-indigo-600/15 border-indigo-500/40 text-white font-medium shadow-sm"
                      : "text-gray-400 hover:text-gray-200 hover:bg-gray-900 border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                        isActive
                          ? "bg-indigo-600/20 border-indigo-500/40 text-indigo-300"
                          : "bg-gray-900 border-gray-800 text-gray-500 group-hover:text-gray-300"
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <p className="text-xs truncate font-medium leading-snug">{nb.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono truncate">
                        {nb.sourcesCount || 0} source(s)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={(e) => onDelete(e, nb.id)}
                    disabled={deletingId === nb.id}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Notebook Workspace"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-800/80 bg-gray-950 flex items-center justify-between text-[11px] text-gray-500">
        <span className="flex items-center gap-1.5 font-mono text-[10px]">
          <Layers className="w-3 h-3 text-indigo-400" />
          Isolated Vector Storage
        </span>
      </div>
    </aside>
  );
}

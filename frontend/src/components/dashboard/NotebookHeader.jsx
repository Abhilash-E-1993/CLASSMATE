import React from "react";
import { BookOpen, Plus, FileText, Calendar, LogIn, Sparkles } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { useNotebook } from "../../context/NotebookContext";

export function NotebookHeader() {
  const { activeNotebook, sources, setIsAddSourceOpen } = useNotebook();
  const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  if (!activeNotebook) return null;

  const formattedDate = activeNotebook.createdAt
    ? new Date(activeNotebook.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently created";

  return (
    <header className="px-6 py-3.5 border-b border-gray-800/80 bg-gray-950/70 backdrop-blur-md flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600/20 to-purple-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-extrabold text-white leading-tight tracking-tight">
              {activeNotebook.name}
            </h2>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px] font-semibold">
              <Sparkles className="w-2.5 h-2.5" />
              Isolated RAG Workspace
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-gray-400 mt-0.5 font-mono">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-500" />
              {formattedDate}
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3 text-gray-500" />
              {sources.length} knowledge source(s)
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => setIsAddSourceOpen(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Source</span>
        </button>

        {isClerkConfigured && (
          <div className="pl-2 border-l border-gray-800 flex items-center">
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer border border-gray-700">
                  <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Sign In</span>
                </button>
              </SignInButton>
            </SignedOut>
          </div>
        )}
      </div>
    </header>
  );
}

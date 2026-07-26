import React from "react";
import { motion } from "framer-motion";
import { Sparkles, BookOpen, ArrowRight, LogIn, Layers, Search, Cpu } from "lucide-react";
import { SignedIn, SignedOut, SignInButton } from "@clerk/clerk-react";
import { useNotebook } from "../../context/NotebookContext";

export function HeroSection() {
  const { setActiveView, setIsCreateNotebookOpen } = useNotebook();
  const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="relative overflow-hidden pt-16 pb-24 md:pt-24 md:pb-32">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-teal-500/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs sm:text-sm font-mono font-semibold mb-8 shadow-sm"
        >
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <span>Advanced Multi-Source RAG Engine v2.0</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight leading-none max-w-5xl mx-auto mb-6"
        >
          Your Personal AI Workspace <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-teal-300 bg-clip-text text-transparent">
            Grounded in Your Knowledge
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-base sm:text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
        >
          Upload PDFs, websites, YouTube videos, transcripts, and notes. Ask questions and get instant, 
          citation-backed answers powered by HyDE, Step-Back prompting, and Reciprocal Rank Fusion.
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          {isClerkConfigured ? (
            <>
              <SignedIn>
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                >
                  <span>Open Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setActiveView("dashboard");
                    setIsCreateNotebookOpen(true);
                  }}
                  className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <span>Create Notebook</span>
                </button>
              </SignedIn>

              <SignedOut>
                <SignInButton mode="modal">
                  <button className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer">
                    <LogIn className="w-4 h-4" />
                    <span>Sign In to Get Started</span>
                  </button>
                </SignInButton>
              </SignedOut>
            </>
          ) : (
            <>
              <button
                onClick={() => setActiveView("dashboard")}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-2.5 transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setIsCreateNotebookOpen(true)}
                className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-gray-900 hover:bg-gray-800 text-gray-200 border border-gray-800 font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Create Notebook</span>
              </button>
            </>
          )}
        </motion.div>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-14 pt-10 border-t border-gray-800/60 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-mono"
        >
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            Qdrant Isolated Vector Filter
          </span>
          <span className="flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-purple-400" />
            Reciprocal Rank Fusion (RRF)
          </span>
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-teal-400" />
            Self-Correction Evaluator Loop
          </span>
        </motion.div>
      </div>
    </div>
  );
}

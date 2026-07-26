import React, { useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { useNotebook } from "../../context/NotebookContext";
import * as api from "../../api/client";

export function ChatInput({ onSendMessage }) {
  const { activeNotebookId, sources, fetchMessages } = useNotebook();
  const [query, setQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || !activeNotebookId || isSending) return;

    const userQuery = query.trim();
    setQuery("");
    setError("");
    setIsSending(true);

    try {
      if (onSendMessage) {
        onSendMessage({ role: "user", content: userQuery });
      }

      const response = await api.sendChatQuery(activeNotebookId, userQuery);
      await api.pollJobUntilComplete(response.jobId);
      await fetchMessages();
    } catch (err) {
      console.error("Chat error:", err);
      setError(err.response?.data?.error || err.message || "Failed to process question");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasSources = sources && sources.length > 0;

  return (
    <div className="p-4 border-t border-gray-800/80 bg-gray-950/80 backdrop-blur-md relative z-10 shrink-0">
      {error && (
        <div className="mb-3 px-3.5 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="relative flex items-center">
        <textarea
          rows={1}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!hasSources || isSending}
          placeholder={
            hasSources
              ? "Ask a question about your sources... (Press Enter to send, Shift+Enter for new line)"
              : "Add at least one knowledge source to start chatting!"
          }
          className="w-full pl-4 pr-12 py-3 rounded-2xl bg-gray-900 border border-gray-800 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none transition-all disabled:opacity-50 font-medium"
        />

        <button
          type="submit"
          disabled={!query.trim() || !hasSources || isSending}
          className="absolute right-2.5 p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-600/20 transition-all disabled:opacity-40 cursor-pointer transform hover:scale-105 active:scale-95"
          title="Send Question"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      {isSending && (
        <div className="mt-2.5 flex items-center gap-2 text-[11px] font-mono text-indigo-400 animate-pulse">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Executing Multi-Query RAG & Self-Correction Quality Evaluation Loop (Max 3 Passes)...</span>
        </div>
      )}
    </div>
  );
}

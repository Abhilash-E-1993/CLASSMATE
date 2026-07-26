import React, { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, HelpCircle } from "lucide-react";
import { useNotebook } from "../../context/NotebookContext";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export function ChatContainer() {
  const { messages, sources } = useNotebook();
  const [localMessages, setLocalMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  const scrollToBottom = (behavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom("smooth"), 100);
    return () => clearTimeout(timer);
  }, [localMessages]);

  const handleOptimisticUserMessage = (msg) => {
    setLocalMessages((prev) => [...prev, { id: `temp-${Date.now()}`, ...msg }]);
  };

  const suggestedPrompts = [
    "Summarize the key takeaways across all uploaded sources.",
    "What are the main concepts and technical mechanisms discussed?",
    "Highlight important facts, data points, or timelines mentioned.",
  ];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-950/40 relative">
      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {localMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-xl mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-lg shadow-indigo-600/10">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-xl font-extrabold text-white mb-2 tracking-tight">
              Start Chatting with Your Workspace
            </h3>
            <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
              {sources.length > 0
                ? "Ask questions about your uploaded documents, YouTube videos, web articles, or transcripts. Answers are grounded with inline citations."
                : "Add PDFs, YouTube links, web pages, or notes to your workspace using the + Add Source button!"}
            </p>

            {sources.length > 0 && (
              <div className="w-full space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 font-mono block">
                  Suggested Prompts:
                </span>
                <div className="flex flex-col gap-2">
                  {suggestedPrompts.map((prompt, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.01, x: 2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => {
                        const inputEl = document.querySelector("textarea");
                        if (inputEl) {
                          inputEl.value = prompt;
                          inputEl.dispatchEvent(new Event("input", { bubbles: true }));
                          inputEl.focus();
                        }
                      }}
                      className="p-3 rounded-xl bg-gray-900/80 hover:bg-gray-800/90 border border-gray-800 text-gray-300 text-xs font-medium transition-all text-left flex items-center gap-2 cursor-pointer group shadow-sm"
                    >
                      <HelpCircle className="w-4 h-4 text-indigo-400 shrink-0 group-hover:scale-110 transition-transform" />
                      <span>"{prompt}"</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <AnimatePresence>
            {localMessages.map((msg, index) => (
              <motion.div
                key={msg.id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChatMessage message={msg} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Fixed Bottom Input Bar */}
      <ChatInput onSendMessage={handleOptimisticUserMessage} />
    </div>
  );
}

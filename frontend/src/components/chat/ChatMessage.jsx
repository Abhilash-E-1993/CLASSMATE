import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Sparkles, ExternalLink, Copy, Check, ShieldCheck } from "lucide-react";
import { useNotebook } from "../../context/NotebookContext";

export function ChatMessage({ message }) {
  const { setActiveCitation } = useNotebook();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /**
   * Parse text inline formatting (bold **text**, inline code `code`, and citations [1], [2])
   */
  const renderInlineFormatted = (text, citations = []) => {
    if (!text) return null;

    const citationRegex = /(\[\s*\d+(?:\s*,\s*\d+)*\s*\])/g;
    const segments = text.split(citationRegex);

    return segments.map((seg, segIdx) => {
      const citeMatch = seg.match(/^\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]$/);
      if (citeMatch) {
        const ids = citeMatch[1].split(",").map((s) => parseInt(s.trim(), 10));
        return (
          <span key={segIdx} className="inline-flex items-center gap-1 mx-0.5 my-0.5 align-middle">
            {ids.map((citeId) => {
              const foundCitation = citations.find(
                (c) => c.id === citeId || c.citationTag === `[${citeId}]`
              );
              return (
                <button
                  key={citeId}
                  onClick={() => foundCitation && setActiveCitation(foundCitation)}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 text-indigo-300 font-mono text-[11px] font-bold transition-all transform hover:scale-105 cursor-pointer shadow-sm"
                  title={
                    foundCitation
                      ? `View citation #${citeId}: "${foundCitation.title}"`
                      : `View citation #${citeId}`
                  }
                >
                  <span>[{citeId}]</span>
                </button>
              );
            })}
          </span>
        );
      }

      const boldCodeRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
      const subParts = seg.split(boldCodeRegex);

      return (
        <React.Fragment key={segIdx}>
          {subParts.map((sub, subIdx) => {
            if (sub.startsWith("**") && sub.endsWith("**")) {
              return (
                <strong key={subIdx} className="font-semibold text-white">
                  {sub.slice(2, -2)}
                </strong>
              );
            }
            if (sub.startsWith("`") && sub.endsWith("`")) {
              return (
                <code
                  key={subIdx}
                  className="px-1.5 py-0.5 rounded bg-gray-800 text-indigo-300 font-mono text-xs border border-gray-700"
                >
                  {sub.slice(1, -1)}
                </code>
              );
            }
            return sub;
          })}
        </React.Fragment>
      );
    });
  };

  /**
   * Format blocks (paragraphs, headers, bullet lists) with Markdown support
   */
  const renderFormattedContent = (content, citations = []) => {
    if (!content) return null;
    if (isUser) {
      return <p className="whitespace-pre-wrap leading-relaxed">{content}</p>;
    }

    const lines = content.split("\n");
    const blocks = [];
    let currentList = [];

    const flushList = (key) => {
      if (currentList.length > 0) {
        blocks.push(
          <ul key={`ul-${key}`} className="list-disc list-inside space-y-1.5 my-2 text-gray-200 pl-1">
            {currentList.map((item, i) => (
              <li key={i} className="leading-relaxed">
                {renderInlineFormatted(item, citations)}
              </li>
            ))}
          </ul>
        );
        currentList = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("### ")) {
        flushList(idx);
        blocks.push(
          <h4 key={idx} className="text-sm font-extrabold text-indigo-300 mt-3.5 mb-1.5 border-b border-gray-800/80 pb-1 tracking-tight">
            {renderInlineFormatted(trimmed.slice(4), citations)}
          </h4>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList(idx);
        blocks.push(
          <h3 key={idx} className="text-base font-extrabold text-white mt-4 mb-2 border-b border-gray-800/80 pb-1 tracking-tight">
            {renderInlineFormatted(trimmed.slice(3), citations)}
          </h3>
        );
      } else if (/^[-*]\s+/.test(trimmed)) {
        const itemText = trimmed.replace(/^[-*]\s+/, "");
        currentList.push(itemText);
      } else if (/^\d+\.\s+/.test(trimmed)) {
        flushList(idx);
        const itemText = trimmed.replace(/^\d+\.\s+/, "");
        blocks.push(
          <div key={idx} className="flex items-start gap-2 my-1.5 pl-1">
            <span className="font-mono text-xs text-indigo-400 font-bold mt-0.5">
              {trimmed.match(/^\d+\./)[0]}
            </span>
            <span className="leading-relaxed">
              {renderInlineFormatted(itemText, citations)}
            </span>
          </div>
        );
      } else if (trimmed === "") {
        flushList(idx);
        blocks.push(<div key={idx} className="h-2" />);
      } else {
        flushList(idx);
        blocks.push(
          <p key={idx} className="leading-relaxed my-1">
            {renderInlineFormatted(line, citations)}
          </p>
        );
      }
    });

    flushList(lines.length);
    return <div className="space-y-1.5 text-xs sm:text-sm">{blocks}</div>;
  };

  const citationsList = message.citations || [];
  const sortedCitations = [...citationsList].sort((a, b) => a.id - b.id);

  const firstCitation = citationsList[0];
  const qualityScore = message.qualityScore ?? firstCitation?.qualityScore;
  const evalAttempts = message.evalAttempts ?? firstCitation?.evalAttempts;
  const evalReasoning = message.evalReasoning ?? firstCitation?.evalReasoning;

  const referencedIds = new Set();
  if (message.content) {
    const matches = message.content.matchAll(/\[\s*(\d+(?:\s*,\s*\d+)*)\s*\]/g);
    for (const m of matches) {
      m[1].split(",").forEach((idStr) => referencedIds.add(parseInt(idStr.trim(), 10)));
    }
  }

  return (
    <div className={`flex gap-3 my-4 ${isUser ? "justify-end" : "justify-start"} group`}>
      {/* AI Avatar */}
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-600/20 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
      )}

      {/* Message Box */}
      <div
        className={`relative max-w-2xl rounded-2xl p-4 text-xs sm:text-sm ${
          isUser
            ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10"
            : "glass-card text-gray-200 rounded-tl-none border border-gray-800/90 shadow-xl"
        }`}
      >
        {renderFormattedContent(message.content, message.citations)}

        {/* Quality Score Badge */}
        {!isUser && qualityScore !== undefined && (
          <div className="mt-3 pt-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border font-mono text-[11px] font-bold ${
                qualityScore >= 7
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-400"
              }`}
              title={evalReasoning || `Quality rating: ${qualityScore}/10`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Quality Score: {qualityScore}/10</span>
              {evalAttempts > 1 && (
                <span className="text-[10px] opacity-75 font-normal">
                  ({evalAttempts} iterations)
                </span>
              )}
            </span>
          </div>
        )}

        {/* Copy button for assistant message */}
        {!isUser && message.content && (
          <button
            onClick={handleCopy}
            className="absolute top-3 right-3 p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 text-gray-400 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 cursor-pointer"
            title="Copy response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        )}

        {/* Citations Footer Chips */}
        {!isUser && sortedCitations.length > 0 && (
          <div className="mt-3.5 pt-3 border-t border-gray-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider font-mono">
                Sources Used (Ranked by Relevance):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {sortedCitations.map((cite) => {
                const isReferenced = referencedIds.has(cite.id);
                return (
                  <motion.button
                    key={cite.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setActiveCitation(cite)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs transition-all cursor-pointer border ${
                      isReferenced
                        ? "bg-indigo-950/80 hover:bg-indigo-900/90 border-indigo-500/40 text-indigo-200 shadow-sm"
                        : "bg-gray-900/80 hover:bg-gray-800/80 border-gray-800 text-gray-400 opacity-85"
                    }`}
                  >
                    <span className="text-indigo-400 font-mono font-bold">[{cite.id}]</span>
                    <span className="truncate max-w-[150px] text-[11px] font-medium">{cite.title}</span>
                    {cite.page && (
                      <span className="text-[10px] text-gray-400">p.{cite.page}</span>
                    )}
                    {cite.startTime && (
                      <span className="text-[10px] text-amber-400 font-mono">{cite.startTime}</span>
                    )}
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-300 shrink-0 mt-0.5">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}

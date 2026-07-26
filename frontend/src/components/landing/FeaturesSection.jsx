import React from "react";
import { motion } from "framer-motion";
import { FileText, Video, Globe, ShieldCheck, Sparkles, Cpu, Search } from "lucide-react";

export function FeaturesSection() {
  const features = [
    {
      icon: <Video className="w-5 h-5 text-red-400" />,
      title: "YouTube & VTT Timestamps",
      description: "Ingest YouTube video links or transcript files. Inline citations jump directly to precise video timestamps.",
      badge: "Video RAG",
    },
    {
      icon: <Globe className="w-5 h-5 text-teal-400" />,
      title: "Clean Web Reader",
      description: "Extract clean article body text from web URLs while automatically filtering navigation bars, ads, and footers.",
      badge: "Web Reader",
    },
    {
      icon: <FileText className="w-5 h-5 text-indigo-400" />,
      title: "PDF & Document Parser",
      description: "Upload PDFs or raw text notes. Preserves page numbers, titles, and structural document hierarchy.",
      badge: "Documents",
    },
    {
      icon: <Sparkles className="w-5 h-5 text-purple-400" />,
      title: "Multi-Query & HyDE RAG",
      description: "Decomposes queries into Step-Back questions, sub-queries, and HyDE hypothetical passages for deep retrieval.",
      badge: "HyDE Engine",
    },
    {
      icon: <Cpu className="w-5 h-5 text-amber-400" />,
      title: "Self-Correction Evaluator",
      description: "A mini-evaluator model grades candidate answers (0-10) and auto-corrects up to 3 passes for high output accuracy.",
      badge: "Evaluator-Optimizer",
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      title: "Strict Workspace Isolation",
      description: "Vector payload filters in Qdrant guarantee notebook isolation so data never leaks across workspaces.",
      badge: "Isolated RAG",
    },
  ];

  return (
    <section className="py-20 bg-gray-950/80 border-t border-gray-800/60 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold mb-4">
            <Search className="w-3.5 h-3.5" />
            <span>Architecture & Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
            Engineered for Grounded Intelligence
          </h2>
          <p className="text-sm sm:text-base text-gray-400 mt-3 leading-relaxed">
            A production-grade multi-source RAG workspace combining vector search, query expansion, and self-correcting evaluation loops.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="p-6 rounded-2xl glass-card relative overflow-hidden group border border-gray-800/80 hover:border-indigo-500/30 transition-all shadow-lg"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-gray-900 border border-gray-800 flex items-center justify-center shadow-inner">
                  {feat.icon}
                </div>
                <span className="text-[10px] font-mono font-bold text-gray-400 px-2.5 py-0.5 rounded-full bg-gray-900 border border-gray-800">
                  {feat.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-2 leading-snug group-hover:text-indigo-300 transition-colors">
                {feat.title}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

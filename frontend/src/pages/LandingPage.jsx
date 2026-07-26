import React from "react";
import { Sparkles, ArrowRight, LogIn, UserPlus } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/clerk-react";
import { HeroSection } from "../components/landing/HeroSection";
import { FeaturesSection } from "../components/landing/FeaturesSection";
import { CreateNotebookModal } from "../components/dashboard/CreateNotebookModal";
import { useNotebook } from "../context/NotebookContext";

export function LandingPage() {
  const { setActiveView } = useNotebook();
  const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-gray-800/80 bg-gray-900/40 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-600/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-bold text-white text-base">NotebookLM Clone</span>
          </div>

          <div className="flex items-center gap-3">
            {isClerkConfigured ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="px-3.5 py-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 font-medium text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer border border-gray-700">
                      <LogIn className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Sign In</span>
                    </button>
                  </SignInButton>

                  <SignUpButton mode="modal">
                    <button className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer">
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Sign Up</span>
                    </button>
                  </SignUpButton>
                </SignedOut>

                <SignedIn>
                  <button
                    onClick={() => setActiveView("dashboard")}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveView("dashboard")}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Open Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Landing Content */}
      <main className="flex-1">
        <HeroSection />
        <FeaturesSection />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 bg-gray-950 py-8 text-center text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4">
          <p>© {new Date().getFullYear()} NotebookLM Clone – Advanced Multi-Source RAG Workspace</p>
          <p className="mt-1 text-[11px] text-gray-600">
            Auth powered by Clerk (Google OAuth, Email/Password & Username)
          </p>
        </div>
      </footer>

      {/* Modals */}
      <CreateNotebookModal />
    </div>
  );
}

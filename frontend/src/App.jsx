import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/clerk-react";
import { NotebookProvider, useNotebook } from "./context/NotebookContext";
import { LandingPage } from "./pages/LandingPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ShieldAlert, LogIn, Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AuthGateScreen() {
  return (
    <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center text-center p-6 text-gray-100 font-sans">
      <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-600/10">
        <ShieldAlert className="w-8 h-8 text-indigo-400" />
      </div>
      <h2 className="text-2xl font-extrabold text-white mb-2 tracking-tight">Sign In Required</h2>
      <p className="text-xs sm:text-sm text-gray-400 max-w-md mb-6 leading-relaxed">
        Access to the RAG workspace is protected. Please sign in with your Google account, Username, or Email to open your workspace.
      </p>
      <SignInButton mode="modal">
        <button className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer">
          <LogIn className="w-4 h-4" />
          <span>Sign In to Access Dashboard</span>
        </button>
      </SignInButton>
    </div>
  );
}

function ClerkProtectedDashboard() {
  const { isLoaded } = useAuth();

  if (!isLoaded) {
    return (
      <div className="h-screen w-screen bg-gray-950 flex flex-col items-center justify-center text-indigo-400 font-sans">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-400" />
        <span className="text-xs font-mono text-gray-400">Authenticating session...</span>
      </div>
    );
  }

  return (
    <>
      <SignedIn>
        <DashboardPage />
      </SignedIn>
      <SignedOut>
        <AuthGateScreen />
      </SignedOut>
    </>
  );
}

function ProtectedDashboard() {
  const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  if (!isClerkConfigured) {
    return <DashboardPage />;
  }

  return <ClerkProtectedDashboard />;
}

function NavigationRouter() {
  const { activeView } = useNotebook();
  return activeView === "landing" ? <LandingPage /> : <ProtectedDashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <NotebookProvider>
        <NavigationRouter />
      </NotebookProvider>
    </QueryClientProvider>
  );
}

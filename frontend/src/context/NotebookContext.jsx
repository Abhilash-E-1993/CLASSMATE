import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@clerk/clerk-react";
import * as api from "../api/client";

const NotebookContext = createContext(null);

function ClerkTokenSyncer({ onTokenSynced }) {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    let isMounted = true;
    if (isSignedIn) {
      getToken().then((token) => {
        if (isMounted) {
          api.setAuthToken(token);
          if (onTokenSynced) onTokenSynced();
        }
      });
    } else {
      api.setAuthToken(null);
    }
    return () => {
      isMounted = false;
    };
  }, [isSignedIn, getToken, onTokenSynced]);

  return null;
}

export function NotebookProvider({ children }) {
  const [activeView, setActiveView] = useState("landing"); // "landing" | "dashboard"
  const [activeNotebookId, setActiveNotebookId] = useState(null);
  const [notebooks, setNotebooks] = useState([]);
  const [sources, setSources] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeCitation, setActiveCitation] = useState(null);

  // Modals state
  const [isCreateNotebookOpen, setIsCreateNotebookOpen] = useState(false);
  const [isAddSourceOpen, setIsAddSourceOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);

  // Load notebooks list
  const fetchNotebooks = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.getNotebooks();
      setNotebooks(list);
      setError(null);

      // Auto-select first notebook if none selected
      if (!activeNotebookId && list.length > 0) {
        setActiveNotebookId(list[0].id);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        // User is not signed in yet or token syncing - set empty list cleanly
        setNotebooks([]);
      } else {
        console.error("Failed to fetch notebooks:", err);
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [activeNotebookId]);

  // Load sources for active notebook
  const fetchSources = useCallback(async () => {
    if (!activeNotebookId) {
      setSources([]);
      return;
    }
    try {
      const list = await api.getNotebookSources(activeNotebookId);
      setSources(list);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("Failed to fetch sources:", err);
      }
    }
  }, [activeNotebookId]);

  // Load chat messages for active notebook
  const fetchMessages = useCallback(async () => {
    if (!activeNotebookId) {
      setMessages([]);
      return;
    }
    try {
      const history = await api.getChatHistory(activeNotebookId);
      setMessages(history);
    } catch (err) {
      if (err.response?.status !== 401) {
        console.error("Failed to fetch messages:", err);
      }
    }
  }, [activeNotebookId]);

  // Fetch initial data
  useEffect(() => {
    fetchNotebooks();
  }, [fetchNotebooks]);

  // Whenever active notebook changes, fetch sources and messages
  useEffect(() => {
    if (activeNotebookId) {
      fetchSources();
      fetchMessages();
    }
  }, [activeNotebookId, fetchSources, fetchMessages]);

  // Auto-poll sources status if any source is in uploading/indexing state
  useEffect(() => {
    const hasPendingSources = sources.some(
      (s) => s.status === "uploading" || s.status === "indexing"
    );
    if (!hasPendingSources) return;

    const interval = setInterval(() => {
      fetchSources();
      fetchNotebooks();
    }, 2000);

    return () => clearInterval(interval);
  }, [sources, fetchSources, fetchNotebooks]);

  // Notebook Action Handlers
  const handleSelectNotebook = (id) => {
    setActiveNotebookId(id);
    setActiveView("dashboard");
  };

  const handleCreateNotebook = async (name) => {
    try {
      const newNb = await api.createNotebook(name);
      await fetchNotebooks();
      setActiveNotebookId(newNb.id);
      setActiveView("dashboard");
      setIsCreateNotebookOpen(false);
      return newNb;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const handleDeleteNotebook = async (id) => {
    try {
      await api.deleteNotebook(id);
      const updatedList = notebooks.filter((n) => n.id !== id);
      setNotebooks(updatedList);
      if (activeNotebookId === id) {
        setActiveNotebookId(updatedList[0]?.id || null);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteSource = async (sourceId) => {
    try {
      await api.deleteSource(sourceId);
      await fetchSources();
      await fetchNotebooks();
    } catch (err) {
      setError(err.message);
    }
  };

  const activeNotebook = notebooks.find((n) => n.id === activeNotebookId) || null;

  return (
    <NotebookContext.Provider
      value={{
        activeView,
        setActiveView,
        activeNotebookId,
        setActiveNotebookId: handleSelectNotebook,
        activeNotebook,
        notebooks,
        sources,
        messages,
        activeCitation,
        setActiveCitation,
        isCreateNotebookOpen,
        setIsCreateNotebookOpen,
        isAddSourceOpen,
        setIsAddSourceOpen,
        loading,
        error,
        fetchNotebooks,
        fetchSources,
        fetchMessages,
        handleCreateNotebook,
        handleDeleteNotebook,
        handleDeleteSource,
      }}
    >
      {isClerkConfigured && <ClerkTokenSyncer onTokenSynced={fetchNotebooks} />}
      {children}
    </NotebookContext.Provider>
  );
}

export function useNotebook() {
  const context = useContext(NotebookContext);
  if (!context) {
    throw new Error("useNotebook must be used within a NotebookProvider");
  }
  return context;
}

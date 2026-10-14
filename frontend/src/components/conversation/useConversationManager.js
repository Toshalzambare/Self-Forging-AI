import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../config.js';

const STORAGE_KEY_ACTIVE_CONV = 'sfa_active_conversation_id';

export function useConversationManager(showToast) {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(() => localStorage.getItem(STORAGE_KEY_ACTIVE_CONV) || null);
  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeForgeState, setActiveForgeState] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 1024);

  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  // Check backend health
  useEffect(() => {
    apiFetch('/health')
      .then((d) => setBackendStatus(d.status === 'healthy' ? 'online' : 'offline'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  // Fetch all conversations for user
  const fetchConversations = useCallback(async () => {
    try {
      const data = await apiFetch('/api/conversations');
      const list = data.conversations || [];
      setConversations(list);
      return list;
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      return [];
    }
  }, []);

  // Load messages for a given conversation
  const loadConversationMessages = useCallback(async (convId) => {
    if (!convId) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    try {
      const data = await apiFetch(`/api/conversations/${convId}`);
      if (activeIdRef.current !== convId) return;
      setMessages(data.messages || []);
      localStorage.setItem(STORAGE_KEY_ACTIVE_CONV, convId);
    } catch (err) {
      console.error(`Failed to load conversation ${convId}:`, err);
      showToast?.('Error', 'Failed to load conversation messages.');
    } finally {
      setIsLoadingMessages(false);
    }
  }, [showToast]);

  // Initial load
  useEffect(() => {
    fetchConversations().then((list) => {
      if (list.length > 0) {
        const stored = localStorage.getItem(STORAGE_KEY_ACTIVE_CONV);
        const match = list.find((c) => c.id === stored);
        const targetId = match ? match.id : list[0].id;
        setActiveId(targetId);
        loadConversationMessages(targetId);
      } else {
        setActiveId(null);
        setMessages([]);
        localStorage.removeItem(STORAGE_KEY_ACTIVE_CONV);
      }
    });
  }, [fetchConversations, loadConversationMessages]);

  // Select conversation
  const selectConversation = useCallback((id) => {
    setActiveId(id);
    loadConversationMessages(id);
  }, [loadConversationMessages]);

  // Create new conversation
  const createConversation = useCallback(async (title = 'New Conversation') => {
    try {
      const newConv = await apiFetch('/api/conversations', {
        method: 'POST',
        body: JSON.stringify({ title }),
      });
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newConv.id);
      setMessages([]);
      localStorage.setItem(STORAGE_KEY_ACTIVE_CONV, newConv.id);
      return newConv;
    } catch (err) {
      showToast?.('Error', 'Failed to create new conversation.');
      throw err;
    }
  }, [showToast]);

  // Rename conversation
  const renameConversation = useCallback(async (id, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await apiFetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() } : c))
      );
      showToast?.('Updated', 'Conversation renamed.');
    } catch (err) {
      showToast?.('Error', 'Failed to rename conversation.');
    }
  }, [showToast]);

  // Toggle pin
  const togglePin = useCallback(async (id, currentPinState) => {
    try {
      await apiFetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_pinned: !currentPinState }),
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_pinned: !currentPinState } : c))
      );
    } catch (err) {
      showToast?.('Error', 'Failed to update pin state.');
    }
  }, [showToast]);

  // Delete conversation
  const deleteConversation = useCallback(async (id) => {
    try {
      await apiFetch(`/api/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id);
        if (activeIdRef.current === id) {
          if (remaining.length > 0) {
            setActiveId(remaining[0].id);
            loadConversationMessages(remaining[0].id);
          } else {
            setActiveId(null);
            setMessages([]);
            localStorage.removeItem(STORAGE_KEY_ACTIVE_CONV);
          }
        }
        return remaining;
      });
      showToast?.('Deleted', 'Conversation removed.');
    } catch (err) {
      showToast?.('Error', 'Failed to delete conversation.');
    }
  }, [loadConversationMessages, showToast]);

  // Send message
  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isSending) return;

    let targetConvId = activeIdRef.current;

    // Auto-create conversation if none is active
    if (!targetConvId) {
      try {
        const initialTitle = text.trim().slice(0, 36);
        const newConv = await createConversation(initialTitle);
        targetConvId = newConv.id;
      } catch (err) {
        return;
      }
    }

    const tempUserId = `user-${Date.now()}`;
    const userMsg = {
      id: tempUserId,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };

    const tempAiId = `ai-${Date.now()}`;
    const aiPlaceholder = {
      id: tempAiId,
      role: 'assistant',
      isLoading: true,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
    setIsSending(true);
    setActiveForgeState('detecting');

    try {
      const data = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text.trim(),
          conversation_id: targetConvId,
        }),
      });

      // Update forge banner states if tool was forged
      if (data.is_tool_forged) {
        setActiveForgeState('forging');
        setTimeout(() => setActiveForgeState('testing'), 600);
        setTimeout(() => {
          setActiveForgeState(data.tests_passed ? 'verified' : 'failed');
          setTimeout(() => setActiveForgeState(null), 4000);
        }, 1200);
        showToast?.('Tool Forged!', 'Agent synthesized, tested, and registered a new capability.');
      } else {
        setActiveForgeState(null);
      }

      const completedAiMsg = {
        id: tempAiId,
        role: 'assistant',
        content: data.reply,
        created_at: new Date().toISOString(),
        forge_data: {
          is_tool_forged: data.is_tool_forged,
          forged_tool: data.forged_tool,
          sandbox_results: data.sandbox_results,
          tests_passed: data.tests_passed,
          repair_attempts: data.repair_attempts,
        },
      };

      setMessages((prev) => prev.map((m) => (m.id === tempAiId ? completedAiMsg : m)));

      // Refresh conversations list to update title & timestamp
      fetchConversations();
    } catch (err) {
      setActiveForgeState(null);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAiId
            ? {
                ...m,
                isLoading: false,
                isError: true,
                content: `Error: ${err.message || 'Failed to send message.'}`,
              }
            : m
        )
      );
      showToast?.('Chat Error', err.message || 'Failed to connect to agent.');
    } finally {
      setIsSending(false);
    }
  }, [createConversation, fetchConversations, isSending, showToast]);

  return {
    conversations,
    activeId,
    messages,
    isLoadingMessages,
    isSending,
    activeForgeState,
    backendStatus,
    isSidebarOpen,
    setIsSidebarOpen,
    selectConversation,
    createConversation,
    renameConversation,
    togglePin,
    deleteConversation,
    sendMessage,
    fetchConversations,
  };
}

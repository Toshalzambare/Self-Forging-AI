import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../../config.js';
import { executeStreamMessage } from './useStreamSender.js';
import {
  useConversationCrud,
  fetchConversationsApi,
  fetchConversationMessagesApi,
  STORAGE_KEY_ACTIVE_CONV,
} from './conversationCrud.js';

export function useConversationManager(showToast, selectedModel) {
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
    apiFetch('/api/health')
      .then((d) => setBackendStatus(d.status === 'ok' ? 'online' : 'offline'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  // Fetch all conversations for user
  const fetchConversations = useCallback(async () => {
    try {
      const list = await fetchConversationsApi();
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
      const msgs = await fetchConversationMessagesApi(convId);
      if (activeIdRef.current !== convId) return;
      setMessages(msgs);
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

  // Conversation CRUD actions
  const {
    selectConversation,
    createConversation,
    renameConversation,
    togglePin,
    deleteConversation,
  } = useConversationCrud({
    setConversations,
    setActiveId,
    setMessages,
    activeIdRef,
    loadConversationMessages,
    showToast,
  });

  // Send message with real-time SSE token and thinking streaming
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

    const activeModel = selectedModel || localStorage.getItem('sfa_selected_model') || 'auto';

    await executeStreamMessage({
      targetConvId,
      text,
      activeModel,
      setMessages,
      setIsSending,
      setActiveForgeState,
      showToast,
      fetchConversations,
      activeIdRef,
    });
  }, [createConversation, fetchConversations, isSending, showToast, selectedModel]);

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

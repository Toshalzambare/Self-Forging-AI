import { useCallback } from 'react';
import { apiFetch } from '../../config.js';

export const STORAGE_KEY_ACTIVE_CONV = 'sfa_active_conversation_id';

export async function createConversationApi(title = 'New Conversation') {
  return apiFetch('/api/conversations', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
}

export async function renameConversationApi(id, newTitle) {
  return apiFetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: newTitle.trim() }),
  });
}

export async function togglePinApi(id, currentPinState) {
  return apiFetch(`/api/conversations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_pinned: !currentPinState }),
  });
}

export async function deleteConversationApi(id) {
  return apiFetch(`/api/conversations/${id}`, {
    method: 'DELETE',
  });
}

export async function fetchConversationsApi() {
  const data = await apiFetch('/api/conversations');
  return data.conversations || [];
}

export async function fetchConversationMessagesApi(convId) {
  const data = await apiFetch(`/api/conversations/${convId}`);
  return data.messages || [];
}

export function useConversationCrud({
  setConversations,
  setActiveId,
  setMessages,
  activeIdRef,
  loadConversationMessages,
  showToast,
}) {
  const selectConversation = useCallback((id) => {
    setActiveId(id);
    loadConversationMessages(id);
  }, [loadConversationMessages, setActiveId]);

  const createConversation = useCallback(async (title = 'New Conversation') => {
    try {
      const newConv = await createConversationApi(title);
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newConv.id);
      setMessages([]);
      localStorage.setItem(STORAGE_KEY_ACTIVE_CONV, newConv.id);
      return newConv;
    } catch (err) {
      showToast?.('Error', 'Failed to create new conversation.');
      throw err;
    }
  }, [setConversations, setActiveId, setMessages, showToast]);

  const renameConversation = useCallback(async (id, newTitle) => {
    if (!newTitle.trim()) return;
    try {
      await renameConversationApi(id, newTitle);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: newTitle.trim() } : c))
      );
      showToast?.('Updated', 'Conversation renamed.');
    } catch (err) {
      showToast?.('Error', 'Failed to rename conversation.');
    }
  }, [setConversations, showToast]);

  const togglePin = useCallback(async (id, currentPinState) => {
    try {
      await togglePinApi(id, currentPinState);
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_pinned: !currentPinState } : c))
      );
    } catch (err) {
      showToast?.('Error', 'Failed to update pin state.');
    }
  }, [setConversations, showToast]);

  const deleteConversation = useCallback(async (id) => {
    try {
      await deleteConversationApi(id);
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
  }, [setConversations, activeIdRef, setActiveId, loadConversationMessages, setMessages, showToast]);

  return {
    selectConversation,
    createConversation,
    renameConversation,
    togglePin,
    deleteConversation,
  };
}

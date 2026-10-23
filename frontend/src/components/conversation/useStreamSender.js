import { fetchSSE } from '../../utils/sseClient.js';

/**
 * Helper hook / executor for Server-Sent Events chat message streaming.
 * Handles incremental thinking process, word-by-word tokens, and activity events.
 */
export async function executeStreamMessage({
  targetConvId,
  text,
  activeModel,
  setMessages,
  setIsSending,
  setActiveForgeState,
  showToast,
  fetchConversations,
  activeIdRef,
}) {
  const startTime = Date.now();
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
    isStreaming: true,
    isThinking: true,
    thinking: '',
    thinkingDurationMs: 0,
    content: '',
    created_at: new Date().toISOString(),
  };

  setMessages((prev) => [...prev, userMsg, aiPlaceholder]);
  setIsSending(true);
  setActiveForgeState('detecting');

  await fetchSSE(`/api/conversations/${targetConvId}/stream`, {
    method: 'POST',
    body: JSON.stringify({
      message: text.trim(),
      model: activeModel,
    }),
  }, {
    onThinking: (chunk) => {
      if (activeIdRef.current !== targetConvId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAiId
            ? { ...m, isThinking: true, thinking: (m.thinking || '') + (chunk ? `${chunk}\n` : '') }
            : m
        )
      );
    },
    onToken: (token) => {
      if (activeIdRef.current !== targetConvId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAiId
            ? { ...m, isLoading: false, isThinking: false, isStreaming: true, content: (m.content || '') + token }
            : m
        )
      );
    },
    onActivity: (act) => {
      if (activeIdRef.current !== targetConvId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempAiId
            ? {
                ...m,
                forge_data: {
                  ...(m.forge_data || {}),
                  ...(act.data || {}),
                  last_event: act.event,
                },
              }
            : m
        )
      );
    },
    onLifecycle: (ev) => {
      const type = ev.event;
      if (type === 'FORGE_STARTED') setActiveForgeState('forging');
      else if (type === 'SANDBOX_TESTING') setActiveForgeState('testing');
      else if (type === 'TOOL_VERIFIED') setActiveForgeState('verified');
      else if (type === 'TOOL_FAILED') setActiveForgeState('failed');
      else if (type === 'TOOL_REUSED') setActiveForgeState('reused');
    },
    onDone: (doneData) => {
      setIsSending(false);
      const fData = doneData.forge_data;
      const totalDuration = Date.now() - startTime;
      if (fData?.is_tool_forged) {
        setActiveForgeState(fData.tests_passed ? 'verified' : 'failed');
        setTimeout(() => setActiveForgeState(null), 3000);
        showToast?.(
          fData.tests_passed ? 'Tool Forged!' : 'Forge Failed',
          fData.tests_passed ? 'Synthesized, tested, and registered new capability.' : 'Sandbox verification failed.'
        );
      } else {
        setActiveForgeState(null);
      }

      if (activeIdRef.current === targetConvId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAiId
              ? {
                  ...m,
                  id: doneData.message_id || tempAiId,
                  isLoading: false,
                  isStreaming: false,
                  isThinking: false,
                  thinkingDurationMs: m.thinkingDurationMs || totalDuration,
                  forge_data: fData || m.forge_data,
                }
              : m
          )
        );
      }
      fetchConversations();
    },
    onError: (err) => {
      setIsSending(false);
      setActiveForgeState(null);
      if (activeIdRef.current === targetConvId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAiId
              ? {
                  ...m,
                  isLoading: false,
                  isStreaming: false,
                  isThinking: false,
                  isError: true,
                  content: m.content
                    ? m.content + `\n\n[Stream interrupted: ${err.message || 'connection lost'}]`
                    : `Error: ${err.message || 'Failed to stream response.'}`,
                }
              : m
          )
        );
      }
      showToast?.('Stream Error', err.message || 'Failed to connect to stream.');
    },
  });
}

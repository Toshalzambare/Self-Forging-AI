/**
 * Server-Sent Events (SSE) Client with Authorization & Automatic 401 Token Refresh.
 * Reads incremental tokens and lifecycle events from FastAPI streaming endpoints.
 */
import { API_BASE_URL, getAccessToken, refreshTokens } from './api.js';

export async function fetchSSE(path, options = {}, callbacks = {}) {
  const { onToken, onLifecycle, onThinking, onActivity, onDone, onError } = callbacks;
  const url = `${API_BASE_URL}${path}`;
  const controller = new AbortController();
  const signal = options.signal || controller.signal;

  let token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
    ...options.headers,
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, {
      ...options,
      headers,
      signal,
    });

    // 401 retry with refreshed token
    if (res.status === 401) {
      token = await refreshTokens();
      headers['Authorization'] = `Bearer ${token}`;
      res = await fetch(url, {
        ...options,
        headers,
        signal,
      });
    }

    if (!res.ok) {
      let detail = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        detail = body.detail || detail;
      } catch (_) {}
      throw new Error(detail);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split('\n\n');
      buffer = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        let eventType = 'message';
        let dataStr = '';

        for (const line of block.split('\n')) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            dataStr = line.slice(6);
          }
        }

        if (!dataStr) continue;

        try {
          const parsed = JSON.parse(dataStr);
          if (eventType === 'token') {
            onToken?.(parsed.token || '');
          } else if (eventType === 'thinking') {
            onThinking?.(parsed.thought || '');
          } else if (eventType === 'activity') {
            onActivity?.(parsed);
          } else if (eventType === 'lifecycle') {
            onLifecycle?.(parsed);
          } else if (eventType === 'done') {
            onDone?.(parsed);
          } else if (eventType === 'error') {
            onError?.(new Error(parsed.error || 'Server stream error'));
          }
        } catch (err) {
          console.warn('[SSE] JSON parse warning:', err, dataStr);
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      onError?.(err);
    }
  }

  return {
    abort: () => controller.abort(),
  };
}

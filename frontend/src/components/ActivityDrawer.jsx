import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityWebSocket } from '../utils/useActivityWebSocket.js';
import { apiFetch } from '../config.js';

const EVENT_CONFIG = {
  AGENT_THINKING: { label: 'Thinking', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: 'psychology' },
  FORGE_STARTED: { label: 'Forging Tool', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: 'construction' },
  SANDBOX_TESTING: { label: 'Sandbox Test', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: 'science' },
  REPAIR_ATTEMPT: { label: 'Repairing', color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: 'build_circle' },
  TOOL_VERIFIED: { label: 'Verified', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: 'verified' },
  TOOL_FAILED: { label: 'Failed', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20', icon: 'cancel' },
  TOOL_REUSED: { label: 'Reused Tool', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: 'recycling' },
};

const ActivityDrawer = ({ isOpen, onClose, showToast }) => {
  const navigate = useNavigate();
  const { events, connectionStatus, clearEvents, isPaused, setIsPaused } = useActivityWebSocket();
  const [historicalLogs, setHistoricalLogs] = useState([]);
  const [expandedTraceId, setExpandedTraceId] = useState(null);

  // Load recent database logs if no live WebSocket events received yet
  useEffect(() => {
    if (isOpen && events.length === 0) {
      apiFetch('/api/logs?limit=15')
        .then((data) => {
          const transformed = (data.logs || []).map((l) => {
            let parsedData = {};
            let summary = l.details || '';
            try {
              const obj = JSON.parse(l.details);
              summary = obj.summary || l.details;
              parsedData = obj;
            } catch (_) {}
            return {
              id: l.id,
              event: l.action,
              status: l.status,
              session_id: l.session_id,
              timestamp: l.created_at,
              summary,
              data: parsedData,
            };
          });
          setHistoricalLogs(transformed);
        })
        .catch((err) => console.warn('Failed to load initial audit logs:', err));
    }
  }, [isOpen, events.length]);

  if (!isOpen) return null;

  const displayList = events.length > 0 ? events : historicalLogs;

  const handleNavigateSession = (sessionId) => {
    onClose();
    navigate(`/activity-logs?session_id=${encodeURIComponent(sessionId)}`);
  };

  return (
    <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[460px] bg-surface-container-low/95 backdrop-blur-xl border-l border-outline-variant/30 shadow-2xl z-50 flex flex-col transition-all">
      {/* Header */}
      <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container/60">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[19px]">browse_activity</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-on-surface">Agent Live Feed</h2>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : connectionStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-outline'
                }`}
              />
              <span className="text-[11px] text-on-surface-variant font-mono capitalize">
                {connectionStatus}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded-lg text-xs font-medium border transition-colors ${
              isPaused
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface'
            }`}
            title={isPaused ? 'Resume live stream' : 'Pause live stream'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isPaused ? 'play_arrow' : 'pause'}
            </span>
          </button>
          <button
            onClick={clearEvents}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Clear feed"
          >
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            title="Close drawer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Stream Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
        {displayList.length === 0 ? (
          <div className="text-center py-20 text-xs text-on-surface-variant space-y-2">
            <span className="material-symbols-outlined text-[32px] text-outline">radar</span>
            <p>Awaiting agent lifecycle events...</p>
          </div>
        ) : (
          displayList.map((item, idx) => {
            const config = EVENT_CONFIG[item.event] || {
              label: item.event,
              color: 'text-on-surface bg-surface-container border-outline-variant/20',
              icon: 'info',
            };
            const itemKey = item.id || `${item.timestamp}-${idx}`;
            const isExpanded = expandedTraceId === itemKey;

            return (
              <div
                key={itemKey}
                className="p-3.5 rounded-xl bg-surface-container/70 border border-outline-variant/20 shadow-sm text-xs space-y-2 transition-all hover:border-outline-variant/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md font-semibold text-[10px] tracking-wider uppercase border flex items-center space-x-1 ${config.color}`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{config.icon}</span>
                    <span>{config.label}</span>
                  </span>
                  <span className="text-[11px] font-mono text-outline">
                    {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>

                <p className="text-on-surface font-medium leading-relaxed">{item.summary}</p>

                <div className="flex items-center justify-between pt-1 border-t border-outline-variant/10 text-[11px]">
                  {item.session_id ? (
                    <button
                      onClick={() => handleNavigateSession(item.session_id)}
                      className="font-mono text-primary hover:underline truncate max-w-[200px]"
                      title="Filter full logs by this session"
                    >
                      Session: {item.session_id.slice(0, 12)}...
                    </button>
                  ) : (
                    <span className="font-mono text-outline">Global Session</span>
                  )}

                  {item.data && Object.keys(item.data).length > 0 && (
                    <button
                      onClick={() => setExpandedTraceId(isExpanded ? null : itemKey)}
                      className="text-on-surface-variant hover:text-on-surface flex items-center space-x-0.5 font-medium"
                    >
                      <span>{isExpanded ? 'Hide' : 'Trace'}</span>
                      <span className="material-symbols-outlined text-[14px]">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  )}
                </div>

                {isExpanded && item.data && (
                  <pre className="mt-2 p-2.5 rounded-lg bg-surface-container-lowest text-[10px] font-mono text-on-surface-variant overflow-x-auto max-h-40 border border-outline-variant/20 custom-scrollbar whitespace-pre-wrap">
                    {JSON.stringify(item.data, null, 2)}
                  </pre>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-3 bg-surface-container/60 border-t border-outline-variant/20 flex items-center justify-between text-xs">
        <span className="text-on-surface-variant text-[11px]">
          {events.length} live buffered
        </span>
        <button
          onClick={() => {
            onClose();
            navigate('/activity-logs');
          }}
          className="text-primary hover:underline font-semibold flex items-center space-x-1"
        >
          <span>Open Full Audit Trail</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </button>
      </div>
    </aside>
  );
};

export default ActivityDrawer;

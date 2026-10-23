import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useActivityWebSocket } from '../utils/useActivityWebSocket.js';
import { apiFetch } from '../config.js';
import ActivityCodeTab from './activity/ActivityCodeTab.jsx';
import ActivitySandboxTab from './activity/ActivitySandboxTab.jsx';

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
  const [activeTab, setActiveTab] = useState('timeline'); // 'timeline' | 'code' | 'sandbox'
  const [historicalLogs, setHistoricalLogs] = useState([]);
  const [expandedTraceId, setExpandedTraceId] = useState(null);

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

  // Extract latest synthesized code, test suite, and sandbox logs
  const latestCodeEvent = displayList.find((e) => e.data?.code || e.data?.code_preview || e.data?.tests);
  const latestSandboxEvent = displayList.find(
    (e) => e.data?.logs || e.event === 'SANDBOX_TESTING' || e.event === 'TOOL_VERIFIED' || e.event === 'TOOL_FAILED'
  );

  const toolCode = latestCodeEvent?.data?.code || latestCodeEvent?.data?.code_preview || '';
  const testCode = latestCodeEvent?.data?.tests || '';
  const toolName = latestCodeEvent?.data?.tool_name || latestCodeEvent?.data?.tool_id || '';
  const schema = latestCodeEvent?.data?.schema || null;

  const sandboxLogs = latestSandboxEvent?.data?.logs || '';
  const isSandboxRunning = latestSandboxEvent?.event === 'SANDBOX_TESTING' && latestSandboxEvent?.status === 'in_progress';
  const testsPassed = latestSandboxEvent?.event === 'TOOL_VERIFIED' || latestSandboxEvent?.status === 'success';

  return (
    <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[480px] bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl z-50 flex flex-col transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
            <span className="material-symbols-outlined text-[19px]">browse_activity</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Activity Workbench</h2>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <span className="text-[11px] text-slate-400 font-mono capitalize">{connectionStatus}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`p-1.5 rounded-lg text-xs font-medium border transition ${isPaused ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
            title={isPaused ? 'Resume live feed' : 'Pause live feed'}
          >
            <span className="material-symbols-outlined text-[18px]">{isPaused ? 'play_arrow' : 'pause'}</span>
          </button>
          <button
            onClick={clearEvents}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition"
            title="Clear feed"
          >
            <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition"
            title="Close drawer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center border-b border-slate-800 px-4 bg-slate-950 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('timeline')}
          className={`py-2.5 px-3 font-medium border-b-2 transition flex items-center space-x-1.5 ${activeTab === 'timeline' ? 'border-indigo-500 text-indigo-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <span className="material-symbols-outlined text-[15px]">timeline</span>
          <span>Timeline</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('code')}
          className={`py-2.5 px-3 font-medium border-b-2 transition flex items-center space-x-1.5 ${activeTab === 'code' ? 'border-purple-500 text-purple-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <span className="material-symbols-outlined text-[15px]">code</span>
          <span>Forged Code</span>
          {toolCode && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('sandbox')}
          className={`py-2.5 px-3 font-medium border-b-2 transition flex items-center space-x-1.5 ${activeTab === 'sandbox' ? 'border-emerald-500 text-emerald-400 font-semibold' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          <span className="material-symbols-outlined text-[15px]">terminal</span>
          <span>Sandbox Console</span>
          {sandboxLogs && <span className={`w-1.5 h-1.5 rounded-full ${testsPassed ? 'bg-emerald-400' : 'bg-rose-400'}`} />}
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'code' ? (
          <ActivityCodeTab toolCode={toolCode} testCode={testCode} toolName={toolName} schema={schema} />
        ) : activeTab === 'sandbox' ? (
          <ActivitySandboxTab sandboxLogs={sandboxLogs} testsPassed={testsPassed} isRunning={isSandboxRunning} />
        ) : displayList.length === 0 ? (
          <div className="text-center py-20 text-xs text-slate-500 space-y-2">
            <span className="material-symbols-outlined text-[32px] text-slate-600">radar</span>
            <p>Awaiting agent lifecycle events...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayList.map((item, idx) => {
              const config = EVENT_CONFIG[item.event] || { label: item.event, color: 'text-slate-200 bg-slate-900 border-slate-800', icon: 'info' };
              const itemKey = item.id || `${item.timestamp}-${idx}`;
              const isExpanded = expandedTraceId === itemKey;
              return (
                <div key={itemKey} className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 shadow-sm text-xs space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] tracking-wider uppercase border flex items-center space-x-1 ${config.color}`}>
                      <span className="material-symbols-outlined text-[13px]">{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      {item.timestamp ? new Date(item.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium leading-relaxed">{item.summary}</p>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px]">
                    <span className="font-mono text-slate-500 truncate max-w-[200px]">
                      {item.session_id ? `Session: ${item.session_id.slice(0, 10)}...` : 'Global Session'}
                    </span>
                    {item.data && Object.keys(item.data).length > 0 && (
                      <button
                        onClick={() => setExpandedTraceId(isExpanded ? null : itemKey)}
                        className="text-slate-400 hover:text-slate-200 flex items-center space-x-0.5 font-medium"
                      >
                        <span>{isExpanded ? 'Hide' : 'Trace'}</span>
                        <span className="material-symbols-outlined text-[14px]">{isExpanded ? 'expand_less' : 'expand_more'}</span>
                      </button>
                    )}
                  </div>
                  {isExpanded && item.data && (
                    <pre className="mt-2 p-2.5 rounded-lg bg-slate-950 text-[10px] font-mono text-slate-300 overflow-x-auto max-h-40 border border-slate-800 custom-scrollbar whitespace-pre-wrap">
                      {JSON.stringify(item.data, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Navigation */}
      <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs">
        <span className="text-slate-500 text-[11px] font-mono">{events.length} live buffered</span>
        <button
          onClick={() => {
            onClose();
            navigate('/activity-logs');
          }}
          className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 transition"
        >
          <span>Open Full Audit Trail</span>
          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
        </button>
      </div>
    </aside>
  );
};

export default ActivityDrawer;

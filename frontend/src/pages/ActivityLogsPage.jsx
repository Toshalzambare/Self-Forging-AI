import React, { useState, useEffect } from 'react';
import { apiFetch, APP_NAME } from '../config.js';

const ActivityLogsPage = ({ showToast }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'success' | 'error'

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiFetch('/api/logs');
        setLogs(data.logs || []);
      } catch (err) {
        showToast?.('Error', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [showToast]);

  const filteredLogs = logs.filter((log) => {
    const isError = log.status === 'error' || log.status === 'failed';
    if (filterStatus === 'success') return !isError;
    if (filterStatus === 'error') return isError;
    return true;
  });

  const successCount = logs.filter((l) => l.status !== 'error' && l.status !== 'failed').length;
  const errorCount = logs.filter((l) => l.status === 'error' || l.status === 'failed').length;

  return (
    <main className="pt-20 min-h-screen bg-surface px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 gap-4 border-b border-outline-variant/20 mb-6">
        <div>
          <div className="flex items-center space-x-2 pb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
              Autonomous Audit Trail
            </span>
            <span className="text-on-surface-variant/40 font-mono text-body-sm">•</span>
            <span className="font-mono text-body-sm text-on-surface-variant">Host: {APP_NAME}-core</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold text-on-surface tracking-tight">
            Activity &amp; Execution Logs
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
            Inspect {APP_NAME}'s thought chains, verified sandbox code, and external tool calls in plain, transparent terms.
          </p>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1">
          {[
            { id: 'all', label: `All (${logs.length})` },
            { id: 'success', label: `Success (${successCount})` },
            { id: 'error', label: `Error / Failed (${errorCount})` },
          ].map((pill) => (
            <button
              key={pill.id}
              type="button"
              onClick={() => setFilterStatus(pill.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-sm whitespace-nowrap ${
                filterStatus === pill.id
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Stream */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 text-on-surface-variant font-mono flex flex-col items-center justify-center space-y-2">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary">sync</span>
            <span>Loading activity audit logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">history</span>
            </div>
            <h3 className="font-semibold text-on-surface text-base">
              {logs.length === 0 ? 'No Activity Logs Recorded' : 'No Matching Logs Found'}
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md">
              {logs.length === 0
                ? 'Agent operations, tool synthesis, verification traces, and runtime actions will automatically appear here as tasks run.'
                : 'Try selecting a different filter above.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isError = log.status === 'error' || log.status === 'failed';
            return (
              <div
                key={log.id}
                className="bg-surface-container-low rounded-2xl p-4 sm:p-5 shadow-sm hover:bg-surface-container/60 transition-all border border-outline-variant/10"
              >
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 shrink-0 ${
                      isError ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {isError ? 'warning' : 'info'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${
                          isError ? 'text-error' : 'text-primary'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-on-surface-variant/40">•</span>
                      <span className="font-mono text-xs text-on-surface-variant">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                      </span>
                    </div>

                    {log.session_id && (
                      <h3 className="font-body-md text-xs sm:text-sm font-semibold text-on-surface mt-1 truncate">
                        Session: {log.session_id}
                      </h3>
                    )}

                    {/* Expandable Trace Viewer */}
                    <details className="mt-2.5 group">
                      <summary className="text-xs text-primary cursor-pointer hover:underline flex items-center space-x-1 select-none font-medium">
                        <span className="material-symbols-outlined text-[15px]">terminal</span>
                        <span>View Execution Details</span>
                        <span className="material-symbols-outlined text-[14px] group-open:rotate-180 transition-transform">
                          expand_more
                        </span>
                      </summary>
                      <pre className="mt-2 font-mono text-xs text-on-surface bg-surface-container-lowest/90 p-3.5 rounded-xl border border-outline-variant/20 whitespace-pre-wrap overflow-x-auto max-h-64 custom-scrollbar leading-relaxed">
                        {log.details || 'No additional trace details.'}
                      </pre>
                    </details>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </main>
  );
};

export default ActivityLogsPage;

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { apiFetch, APP_NAME } from '../config.js';
import LogFilterBar from '../components/logs/LogFilterBar.jsx';
import LogTraceModal from '../components/logs/LogTraceModal.jsx';

const ActivityLogsPage = ({ showToast }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSession = searchParams.get('session_id') || '';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sessionIdFilter, setSessionIdFilter] = useState(initialSession);
  const [inspectingLog, setInspectingLog] = useState(null);

  // Sync session filter with URL params
  useEffect(() => {
    const urlSession = searchParams.get('session_id') || '';
    setSessionIdFilter(urlSession);
  }, [searchParams]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (sessionIdFilter) params.set('session_id', sessionIdFilter);
      params.set('limit', '100');

      const data = await apiFetch(`/api/logs?${params.toString()}`);
      setLogs(data.logs || []);
    } catch (err) {
      showToast?.('Error Fetching Logs', err.message);
    } finally {
      setLoading(false);
    }
  }, [sessionIdFilter, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleSessionChange = (newSession) => {
    setSessionIdFilter(newSession);
    if (newSession) {
      setSearchParams({ session_id: newSession });
    } else {
      setSearchParams({});
    }
  };

  const handleClearSession = () => {
    setSessionIdFilter('');
    setSearchParams({});
  };

  const counts = useMemo(() => {
    const res = { all: logs.length, success: 0, failed: 0, security_violation: 0, in_progress: 0 };
    logs.forEach((l) => {
      const s = (l.status || '').toLowerCase();
      if (s === 'success' || s === 'passed') res.success += 1;
      else if (s === 'failed' || s === 'error') res.failed += 1;
      else if (s === 'security_violation') res.security_violation += 1;
      else if (s === 'in_progress') res.in_progress += 1;
    });
    return res;
  }, [logs]);

  const visibleLogs = useMemo(() => {
    if (!statusFilter || statusFilter === 'all') return logs;
    return logs.filter((l) => {
      const s = (l.status || '').toLowerCase();
      if (statusFilter === 'success') return s === 'success' || s === 'passed';
      if (statusFilter === 'failed') return s === 'failed' || s === 'error';
      return s === statusFilter.toLowerCase();
    });
  }, [logs, statusFilter]);

  return (
    <main className="pt-20 min-h-screen bg-surface px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full pb-16">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 gap-4 border-b border-outline-variant/20 mb-6">
        <div>
          <div className="flex items-center space-x-2 pb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
              Observability &amp; Audit Trail
            </span>
            <span className="text-on-surface-variant/40 font-mono text-body-sm">•</span>
            <span className="font-mono text-body-sm text-on-surface-variant">System: {APP_NAME}-core</span>
          </div>
          <h1 className="font-headline-lg text-2xl font-semibold text-on-surface tracking-tight">
            Activity &amp; Execution Audit Logs
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant max-w-2xl mt-1">
            Real-time chronological trace of every autonomous reasoning step, tool forging pipeline, sandbox test run, and admission gate decision.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchLogs}
          className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/20 text-xs font-semibold text-on-surface flex items-center space-x-1.5 transition self-start md:self-end shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Filter Bar */}
      <LogFilterBar
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        sessionId={sessionIdFilter}
        onSessionChange={handleSessionChange}
        onClearSession={handleClearSession}
        counts={counts}
      />

      {/* Logs Stream */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="text-center py-20 text-on-surface-variant font-mono flex flex-col items-center justify-center space-y-2">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary">sync</span>
            <span className="text-xs">Loading activity audit logs...</span>
          </div>
        ) : visibleLogs.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">history</span>
            </div>
            <h3 className="font-semibold text-on-surface text-sm">No Logs Found</h3>
            <p className="text-xs text-on-surface-variant max-w-md">
              {sessionIdFilter
                ? `No activity logs recorded for session '${sessionIdFilter}'.`
                : 'No logs match your selected filter criteria.'}
            </p>
          </div>
        ) : (
          visibleLogs.map((log) => {
            const isError = log.status === 'error' || log.status === 'failed' || log.status === 'security_violation';
            let summary = log.details || '';
            try {
              const obj = JSON.parse(log.details);
              summary = obj.summary || log.details;
            } catch (_) {}

            return (
              <div
                key={log.id}
                className="bg-surface-container-low rounded-2xl p-4 sm:p-5 shadow-sm hover:bg-surface-container/60 transition border border-outline-variant/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 shrink-0 ${
                      isError ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[19px]">
                      {log.status === 'security_violation' ? 'security' : isError ? 'warning' : 'check_circle'}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border font-mono ${
                          isError ? 'text-error border-error/20 bg-error-container/10' : 'text-primary border-primary/20 bg-primary-container/10'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="text-on-surface-variant/40">•</span>
                      <span className="font-mono text-[11px] text-on-surface-variant">
                        {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-on-surface font-medium mt-1.5 leading-relaxed line-clamp-2">
                      {summary}
                    </p>

                    {log.session_id && (
                      <span className="inline-block mt-1 font-mono text-[11px] text-outline">
                        Session ID: {log.session_id}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingLog(log)}
                  className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-primary border border-outline-variant/20 transition flex items-center space-x-1.5 shrink-0 self-end sm:self-center"
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  <span>Inspect Trace</span>
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Deep Trace Inspector Modal */}
      {inspectingLog && (
        <LogTraceModal
          isOpen={Boolean(inspectingLog)}
          log={inspectingLog}
          onClose={() => setInspectingLog(null)}
          showToast={showToast}
        />
      )}
    </main>
  );
};

export default ActivityLogsPage;

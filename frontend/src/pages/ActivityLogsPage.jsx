import React, { useState, useEffect } from 'react';
import { apiFetch, APP_NAME } from '../config.js';

const ActivityLogsPage = ({ showToast, user }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await apiFetch('/api/logs');
        setLogs(data.logs || []);
      } catch (err) {
        showToast('Error', err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [showToast]);

  return (
    <main className="pt-20 min-h-screen bg-surface px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 gap-4 border-b border-outline-variant/20 mb-8">
        <div>
          <div className="flex items-center space-x-2 pb-1">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Autonomous Audit Trail</span>
            <span className="text-on-surface-variant/40 font-mono text-body-sm">•</span>
            <span className="font-mono text-body-sm text-on-surface-variant">Host: {APP_NAME}-core</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold text-on-surface tracking-tight">Activity &amp; Execution Logs</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
            Inspect {APP_NAME}'s thought chains, verified sandbox code, and external tool calls in plain, transparent terms.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-10 text-on-surface-variant font-mono">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-on-surface-variant font-mono">No logs recorded yet.</div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="bg-surface-container-low rounded-2xl p-5 shadow-sm hover:bg-surface-container/60 transition-all border border-outline-variant/10">
              <div className="flex items-start space-x-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${log.status === 'error' || log.status === 'failed' ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary'}`}>
                  <span className="material-symbols-outlined text-[19px]">
                    {log.status === 'error' || log.status === 'failed' ? 'warning' : 'info'}
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-label-sm text-label-sm uppercase tracking-wider font-semibold ${log.status === 'error' || log.status === 'failed' ? 'text-error' : 'text-primary'}`}>
                      {log.action}
                    </span>
                    <span className="text-on-surface-variant/40">•</span>
                    <span className="font-mono text-body-sm text-on-surface-variant">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-1">
                    Session: {log.session_id}
                  </h3>
                  <div className="mt-2 font-mono text-body-sm text-on-surface-variant bg-surface-container p-3 rounded-lg border border-outline-variant/20 whitespace-pre-wrap">
                    {log.details}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
};

export default ActivityLogsPage;

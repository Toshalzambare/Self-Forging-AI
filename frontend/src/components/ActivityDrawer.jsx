import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config.js';

const ActivityDrawer = ({ isOpen, onClose, showToast }) => {
  const [filter, setFilter] = useState('all');
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    if (isOpen) {
      apiFetch('/api/logs').then(data => {
        setLogs(data.logs || []);
      }).catch(err => {
        console.error('Failed to load activity logs:', err);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-surface-container-low border-l border-outline-variant/30 shadow-2xl z-50 flex flex-col">
      <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container">
        <div className="flex items-center space-x-2">
          <span className="material-symbols-outlined text-[18px] text-primary">browse_activity</span>
          <span className="text-body-md font-semibold text-on-surface">Agent Activity Feed</span>
        </div>
        <button
          className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          onClick={onClose}
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="px-4 py-2 border-b border-outline-variant/20 flex items-center space-x-2 text-xs">
        <button onClick={() => setFilter('all')} className={`px-2.5 py-1 rounded-md ${filter === 'all' ? 'bg-primary-container/20 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'}`}>All Activities</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-4 text-xs text-on-surface-variant">No recent activity.</div>
        ) : (
          logs.slice(0, 10).map(log => (
            <div key={log.id} className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-xs space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className={`font-medium flex items-center gap-1 ${log.status === 'error' ? 'text-error' : 'text-primary'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${log.status === 'error' ? 'bg-error' : 'bg-emerald-400'}`}></span>
                  {log.action}
                </span>
                <span className="text-outline">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
              <p className="text-on-surface font-medium line-clamp-2">{log.details}</p>
              <span className="text-[11px] text-on-surface-variant font-mono">Session: {log.session_id}</span>
            </div>
          ))
        )}
      </div>

      <div className="p-3 bg-surface-container border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
        <span>Auto-refresh enabled</span>
        <button onClick={() => showToast('Report Downloaded', 'Audit trail exported as JSON.')} className="text-primary hover:underline">Download Report</button>
      </div>
    </aside>
  );
};

export default ActivityDrawer;

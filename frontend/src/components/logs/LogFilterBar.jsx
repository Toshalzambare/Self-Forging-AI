import React from 'react';

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Success' },
  { id: 'failed', label: 'Failed' },
  { id: 'security_violation', label: 'Security Violations' },
  { id: 'in_progress', label: 'In Progress' },
];

const LogFilterBar = ({
  statusFilter,
  onStatusChange,
  sessionId,
  onSessionChange,
  onClearSession,
  counts = {},
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-container-low p-4 rounded-2xl border border-outline-variant/20 shadow-sm">
      {/* Status Filter Tabs */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
        {STATUS_TABS.map((tab) => {
          const count = counts[tab.id] ?? 0;
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onStatusChange(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition shadow-sm whitespace-nowrap flex items-center space-x-1.5 ${
                isActive
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-on-primary/20 text-on-primary' : 'bg-surface-container-high text-on-surface-variant'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Session Filter Input & Active Chip */}
      <div className="flex items-center space-x-2 w-full md:w-auto">
        <div className="relative flex-1 md:w-64">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">
            filter_alt
          </span>
          <input
            type="text"
            value={sessionId}
            onChange={(e) => onSessionChange(e.target.value)}
            placeholder="Filter by session ID..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl bg-surface-container text-xs text-on-surface placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-primary border border-outline-variant/30 font-mono transition"
          />
          {sessionId && (
            <button
              type="button"
              onClick={onClearSession}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface text-[16px]"
              title="Clear session filter"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {sessionId && (
          <div className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-primary-container/20 border border-primary/30 text-primary text-xs font-mono">
            <span className="material-symbols-outlined text-[14px]">link</span>
            <span className="truncate max-w-[120px]">{sessionId}</span>
            <button
              type="button"
              onClick={onClearSession}
              className="text-primary hover:text-on-surface"
              title="Remove filter"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LogFilterBar;

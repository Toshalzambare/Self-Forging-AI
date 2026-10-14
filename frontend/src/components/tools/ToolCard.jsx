import React from 'react';
import ToolMetricsBadge from './ToolMetricsBadge.jsx';

/**
 * ToolCard:
 * Modern card displaying individual tool summary, real-time Dual-Gate metrics,
 * active/inactive status switch, and quick action bar (Inspect, Test, Export, Delete).
 */
const ToolCard = ({
  tool,
  onInspect,
  onTest,
  onExport,
  onToggleStatus,
  onDelete,
  testingTool,
}) => {
  const isTesting = testingTool === tool.id;
  const isActive = tool.status === 'active';

  return (
    <div className="relative rounded-2xl bg-surface-container p-6 shadow-xl flex flex-col justify-between group hover:bg-surface-container-high transition-all border border-outline-variant/30 space-y-4">
      {/* Top Header: Icon, Name & Status Switch */}
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-primary-container/20 text-primary">
            <span className="material-symbols-outlined text-[26px] material-symbols-fill">
              auto_awesome
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Active / Inactive Status Switch */}
            <button
              onClick={() => onToggleStatus(tool.id, isActive ? 'inactive' : 'active')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center space-x-1.5 transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
                  : 'bg-surface-container-high text-on-surface-variant border-outline-variant/30 hover:bg-surface-bright'
              }`}
              title={isActive ? 'Click to deactivate tool' : 'Click to activate tool'}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isActive ? 'toggle_on' : 'toggle_off'}
              </span>
              <span>{isActive ? 'Enabled' : 'Disabled'}</span>
            </button>

            {/* Delete Tool */}
            <button
              onClick={() => onDelete(tool.id, tool.name)}
              className="p-1.5 rounded-lg text-outline hover:text-error hover:bg-error/10 transition-colors"
              title="Delete tool"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span>
            </button>
          </div>
        </div>

        <div>
          <h3 className="font-headline-sm text-base font-semibold text-on-surface">
            {tool.name}
          </h3>
          <p className="font-body-sm text-xs text-on-surface-variant mt-1.5 leading-relaxed line-clamp-2">
            {tool.description || 'No description provided.'}
          </p>
        </div>
      </div>

      {/* Metrics Badge */}
      <div className="pt-1">
        <ToolMetricsBadge
          status={tool.status}
          reuseCount={tool.reuse_count}
          successRate={tool.success_rate}
          gateScore={tool.gate_score}
          lastUsedAt={tool.last_used_at}
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-outline-variant/20 flex flex-col sm:flex-row gap-2">
        <button
          onClick={() => onInspect(tool)}
          className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-bright text-on-surface font-body-sm text-xs font-medium text-center transition-colors shadow-sm flex items-center justify-center space-x-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">visibility</span>
          <span>Inspect</span>
        </button>

        <button
          disabled={isTesting}
          onClick={() => onTest(tool.id)}
          className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-bright text-on-surface font-body-sm text-xs font-medium text-center transition-colors shadow-sm disabled:opacity-60 flex items-center justify-center space-x-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isTesting ? 'sync' : 'play_arrow'}
          </span>
          <span>{isTesting ? 'Testing...' : 'Test'}</span>
        </button>

        <button
          onClick={() => onExport(tool)}
          className="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-bright text-on-surface font-body-sm text-xs font-medium text-center transition-colors shadow-sm flex items-center justify-center space-x-1.5"
          title="Export as .sfatool"
        >
          <span className="material-symbols-outlined text-[16px]">download</span>
          <span className="sm:hidden lg:inline">Export</span>
        </button>
      </div>
    </div>
  );
};

export default ToolCard;

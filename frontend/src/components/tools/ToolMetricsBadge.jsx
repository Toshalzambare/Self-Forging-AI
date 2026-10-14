import React from 'react';

/**
 * ToolMetricsBadge:
 * Displays status badge, Dual-Gate evaluation score, reuse count chip,
 * and success rate percentage in a compact, responsive chip bar.
 */
const ToolMetricsBadge = ({
  status = 'active',
  reuseCount = 0,
  successRate = 0.0,
  gateScore = 0.0,
  lastUsedAt = null,
}) => {
  const getStatusConfig = (s) => {
    switch (s?.toLowerCase()) {
      case 'active':
        return {
          label: 'Active',
          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'degraded':
        return {
          label: 'Degraded',
          color: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'quarantined':
        return {
          label: 'Quarantined',
          color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
        };
      case 'inactive':
      default:
        return {
          label: 'Inactive',
          color: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
          dot: 'bg-outline',
        };
    }
  };

  const statusConfig = getStatusConfig(status);
  const gateScorePct = Math.round((gateScore || 0) * 100);
  const successPct = Math.round((successRate || 0) * 100);

  const formattedLastUsed = lastUsedAt
    ? new Date(lastUsedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    : 'Never';

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      {/* Status Badge */}
      <span
        className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center space-x-1.5 shadow-sm ${statusConfig.color}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot} animate-pulse`} />
        <span>{statusConfig.label}</span>
      </span>

      {/* Dual-Gate Score Chip */}
      <span
        className="px-2 py-0.5 rounded-md bg-primary-container/20 border border-primary/25 text-primary text-[11px] font-medium flex items-center space-x-1"
        title="Dual-Gate Admission Score (Task alignment & regression rate)"
      >
        <span className="material-symbols-outlined text-[13px]">verified_user</span>
        <span>Gate: {gateScorePct}%</span>
      </span>

      {/* Reuse Count Chip */}
      <span
        className="px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/30 text-on-surface-variant text-[11px] flex items-center space-x-1"
        title="Total reuse executions"
      >
        <span className="material-symbols-outlined text-[13px]">replay</span>
        <span>{reuseCount} reuses</span>
      </span>

      {/* Success Rate Chip */}
      <span
        className="px-2 py-0.5 rounded-md bg-surface-container-high border border-outline-variant/30 text-on-surface-variant text-[11px] flex items-center space-x-1"
        title="Execution success rate"
      >
        <span className="material-symbols-outlined text-[13px]">trending_up</span>
        <span>{successPct}% success</span>
      </span>

      {/* Last Used Timestamp */}
      <span
        className="text-[11px] text-outline ml-auto hidden sm:inline-block"
        title={lastUsedAt ? new Date(lastUsedAt).toLocaleString() : 'Never used'}
      >
        Used: {formattedLastUsed}
      </span>
    </div>
  );
};

export default ToolMetricsBadge;

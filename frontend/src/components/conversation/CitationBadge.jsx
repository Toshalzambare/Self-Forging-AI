import React from 'react';

/**
 * CitationBadge Component.
 * Renders an interactive, clickable pill badge for referenced tools and uploaded documents.
 */
export default function CitationBadge({ type, target, label, onClick }) {
  const isTool = type === 'tool';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.({ type, target });
      }}
      className={`inline-flex items-center space-x-1 px-2 py-0.5 my-0.5 mx-1 rounded-full text-[11px] font-mono transition-all select-none border shadow-sm ${
        isTool
          ? 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30 hover:border-indigo-500/50'
          : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/50'
      }`}
      title={`Click to inspect ${isTool ? 'tool source' : 'document source'}: ${target}`}
    >
      <span className="material-symbols-outlined text-[13px]">
        {isTool ? 'construction' : 'description'}
      </span>
      <span className="font-semibold">{label || target}</span>
      <span className="material-symbols-outlined text-[11px] opacity-70">open_in_new</span>
    </button>
  );
}

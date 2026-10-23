import React, { useState, useEffect, useRef } from 'react';

/**
 * ThinkingBlock Component.
 * Renders a collapsible accordion displaying the agent's internal reasoning process.
 * Auto-expands while thinking, auto-collapses on completion, and shows an elapsed timer.
 */
export default function ThinkingBlock({ thinking, isThinking, durationMs }) {
  const [isExpanded, setIsExpanded] = useState(Boolean(isThinking));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const containerRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  // Elapsed timer while thinking
  useEffect(() => {
    if (!isThinking) return;
    startTimeRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(((Date.now() - startTimeRef.current) / 1000).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, [isThinking]);

  // Auto-collapse when thinking finishes, auto-expand while streaming
  useEffect(() => {
    if (isThinking) {
      setIsExpanded(true);
    } else if (thinking && !isThinking) {
      setIsExpanded(false);
    }
  }, [isThinking]);

  // Auto-scroll thought text while streaming
  useEffect(() => {
    if (isExpanded && isThinking && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [thinking, isExpanded, isThinking]);

  if (!thinking && !isThinking) return null;

  const displayTime = durationMs
    ? `${(durationMs / 1000).toFixed(1)}s`
    : `${elapsedSeconds || '0.1'}s`;

  return (
    <div className="mb-3 rounded-xl border border-indigo-500/20 bg-slate-950/50 backdrop-blur-sm overflow-hidden text-xs transition-all">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-indigo-500/5 transition select-none group"
      >
        <div className="flex items-center space-x-2">
          <div
            className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
              isThinking
                ? 'bg-indigo-500/20 text-indigo-400 animate-pulse ring-1 ring-indigo-500/40'
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">psychology</span>
          </div>

          <span className="font-medium text-slate-300">
            {isThinking ? (
              <span className="flex items-center space-x-1.5 text-indigo-300">
                <span>Thinking...</span>
                <span className="font-mono text-[11px] text-indigo-400/80">({displayTime})</span>
              </span>
            ) : (
              <span className="text-slate-400 group-hover:text-slate-200 transition">
                Thought for {displayTime}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center space-x-1 text-slate-500 group-hover:text-slate-300">
          <span className="text-[11px] font-mono">{isExpanded ? 'Hide' : 'View process'}</span>
          <span className="material-symbols-outlined text-[16px] transition-transform duration-200">
            {isExpanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </button>

      {/* Accordion Body */}
      {isExpanded && (
        <div
          ref={containerRef}
          className="px-3.5 py-3 border-t border-indigo-500/10 bg-slate-950/80 max-h-56 overflow-y-auto custom-scrollbar font-mono text-[11px] leading-relaxed text-slate-400/90 whitespace-pre-wrap select-text"
        >
          {thinking || 'Reasoning about capabilities and analyzing request...'}
          {isThinking && (
            <span className="inline-block w-1.5 h-3 ml-1 align-middle bg-indigo-400 animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}

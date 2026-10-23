import React from 'react';

/**
 * ActivitySandboxTab Component.
 * Renders live and historical Docker sandbox pytest execution logs (stdout/stderr).
 */
export default function ActivitySandboxTab({ sandboxLogs, testsPassed, isRunning }) {
  if (!sandboxLogs && !isRunning) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-3">
        <span className="material-symbols-outlined text-[36px] text-slate-600">terminal</span>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">Sandbox Console Idle</p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            When the agent verifies a newly synthesized tool in the Docker sandbox, live test execution logs (stdout/stderr) will appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Sandbox Header / Status Bar */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-xs">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isRunning
                ? 'bg-amber-400 animate-pulse'
                : testsPassed
                ? 'bg-emerald-400'
                : 'bg-rose-400'
            }`}
          />
          <span className="font-mono text-slate-300">
            {isRunning ? 'Running tests...' : testsPassed ? 'Verification Passed' : 'Test Failures Detected'}
          </span>
        </div>

        <span
          className={`px-2 py-0.5 rounded font-mono text-[10px] font-semibold uppercase border ${
            testsPassed
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : isRunning
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}
        >
          {isRunning ? 'In Sandbox' : testsPassed ? 'Exit 0' : 'Exit 1'}
        </span>
      </div>

      {/* Terminal View */}
      <div className="flex-1 overflow-auto rounded-xl bg-black/90 border border-slate-800 p-3.5 custom-scrollbar font-mono text-[11px] leading-relaxed text-slate-300 select-text">
        <div className="flex items-center space-x-1.5 pb-2 mb-2 border-b border-slate-800/60 text-slate-500 text-[10px]">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          <span className="ml-2 font-mono">sandbox@sfa:~/test_runner.py</span>
        </div>

        <pre className="whitespace-pre-wrap break-words">
          {sandboxLogs || (isRunning ? 'Initializing sandbox container...\nRunning: pytest -q --tb=short' : '')}
        </pre>
      </div>
    </div>
  );
}

import React, { useState } from 'react';

/**
 * ActivityCodeTab Component.
 * Displays dynamically forged Python code and test suites inside the Activity Drawer.
 */
export default function ActivityCodeTab({ toolCode, testCode, toolName, schema }) {
  const [activeSubTab, setActiveSubTab] = useState('code'); // 'code' | 'tests' | 'schema'
  const [copied, setCopied] = useState(false);

  const activeContent =
    activeSubTab === 'code'
      ? toolCode
      : activeSubTab === 'tests'
      ? testCode
      : schema
      ? JSON.stringify(schema, null, 2)
      : '';

  const handleCopy = () => {
    if (!activeContent) return;
    navigator.clipboard.writeText(activeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!toolCode && !testCode) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-slate-500 space-y-3">
        <span className="material-symbols-outlined text-[36px] text-slate-600">code_blocks</span>
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">No Tool Synthesized Yet</p>
          <p className="text-[11px] text-slate-500 max-w-xs">
            When the agent detects an unmet capability, its dynamically synthesized Python code will appear here in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Sub-tab switcher */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex space-x-1.5">
          <button
            type="button"
            onClick={() => setActiveSubTab('code')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              activeSubTab === 'code'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Python Tool
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('tests')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
              activeSubTab === 'tests'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Pytest Suite
          </button>
          {schema && (
            <button
              type="button"
              onClick={() => setActiveSubTab('schema')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                activeSubTab === 'schema'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              JSON Schema
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          title="Copy code"
        >
          <span className="material-symbols-outlined text-[14px]">
            {copied ? 'check' : 'content_copy'}
          </span>
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>

      {toolName && (
        <div className="text-[11px] font-mono text-indigo-400 flex items-center space-x-1">
          <span className="material-symbols-outlined text-[14px]">terminal</span>
          <span>tool_id: {toolName}</span>
        </div>
      )}

      {/* Code Container */}
      <div className="flex-1 overflow-auto rounded-xl bg-slate-950 border border-slate-800/80 p-3 custom-scrollbar">
        <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre select-text">
          <code>{activeContent || '# No code generated for this section'}</code>
        </pre>
      </div>
    </div>
  );
}

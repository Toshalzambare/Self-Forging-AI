import React, { useState } from 'react';

const CodeArtifactCard = ({ tool, sandboxResults, testsPassed, repairAttempts }) => {
  const [activeTab, setActiveTab] = useState('code'); // 'code' | 'schema' | 'tests' | 'trace'
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!tool && !sandboxResults) return null;

  const toolName = tool?.schema?.name || tool?.name || 'Synthesized Tool';
  const toolDesc = tool?.schema?.description || tool?.description || 'Custom autonomous function';
  const toolCode = tool?.code || '';
  const toolSchema = tool?.schema ? JSON.stringify(tool.schema, null, 2) : '';
  const testsCode = tool?.tests || '';

  const handleCopy = () => {
    let textToCopy = toolCode;
    if (activeTab === 'schema') textToCopy = toolSchema;
    if (activeTab === 'tests') textToCopy = testsCode;
    if (activeTab === 'trace') textToCopy = sandboxResults || '';

    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="p-3.5 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
            <span className="material-symbols-outlined text-[18px]">terminal</span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-white tracking-wide">{toolName}</span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  testsPassed
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {testsPassed ? 'Verified in Sandbox' : 'Test Failed'}
              </span>
              {repairAttempts > 0 && (
                <span className="text-[10px] font-medium text-amber-400 px-1.5 py-0.5 rounded bg-amber-500/10">
                  {repairAttempts} repair{repairAttempts > 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{toolDesc}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 text-xs text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg transition"
            title="Copy content"
          >
            <span className="material-symbols-outlined text-[14px]">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition"
            title={isExpanded ? 'Collapse view' : 'Expand full view'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {isExpanded ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-950/40 border-b border-slate-800/60 px-3 pt-2 space-x-2 text-xs">
        {[
          { id: 'code', label: 'Python Source', icon: 'code' },
          { id: 'schema', label: 'JSON Schema', icon: 'data_object' },
          testsCode && { id: 'tests', label: 'Pytest Suite', icon: 'science' },
          sandboxResults && { id: 'trace', label: 'Sandbox Output', icon: 'output' },
        ]
          .filter(Boolean)
          .map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
      </div>

      {/* Code Body */}
      <div
        className={`p-4 font-mono text-xs text-slate-300 overflow-x-auto custom-scrollbar bg-slate-950/80 transition-all ${
          isExpanded ? 'max-h-[500px]' : 'max-h-48'
        }`}
      >
        <pre className="whitespace-pre">
          {activeTab === 'code' && (toolCode || '# No code generated')}
          {activeTab === 'schema' && (toolSchema || '{}')}
          {activeTab === 'tests' && (testsCode || '# No tests generated')}
          {activeTab === 'trace' && (sandboxResults || 'No execution trace')}
        </pre>
      </div>
    </div>
  );
};

export default CodeArtifactCard;

import React, { useState, useEffect } from 'react';

/**
 * ToolDetailModal:
 * Multi-tab inspection modal for Python code, JSON input schema,
 * adversarial test suite, and Dual-Gate metrics.
 */
const ToolDetailModal = ({ tool, onClose, onExport, showToast }) => {
  const [activeTab, setActiveTab] = useState('code');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!tool) return null;

  const getCopyContent = () => {
    switch (activeTab) {
      case 'code':
        return tool.code || '';
      case 'schema':
        return JSON.stringify(tool.schema || {}, null, 2);
      case 'tests':
        return tool.tests_code || '# No tests recorded';
      default:
        return tool.code || '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCopyContent());
    setCopied(true);
    if (showToast) showToast('Copied', 'Snippet copied to clipboard.');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[90vh] bg-surface-container rounded-2xl border border-outline-variant/30 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container-low">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <span className="material-symbols-outlined text-primary text-[22px]">
                terminal
              </span>
              <h2 className="text-lg font-semibold text-on-surface font-headline-sm">
                {tool.name}
              </h2>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono uppercase bg-primary-container/20 text-primary border border-primary/30">
                {tool.status}
              </span>
            </div>
            <p className="text-xs text-on-surface-variant max-w-xl line-clamp-1">
              {tool.description || 'No description provided.'}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {onExport && (
              <button
                onClick={() => onExport(tool)}
                className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface flex items-center space-x-1.5 transition-colors border border-outline-variant/30"
                title="Download as .sfatool"
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span className="hidden sm:inline">Export</span>
              </button>
            )}
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs text-on-surface flex items-center space-x-1.5 transition-colors border border-outline-variant/30"
              title="Copy snippet"
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-outline-variant/20 bg-surface-container-low px-4">
          {[
            { id: 'code', label: 'Python Executable', icon: 'code' },
            { id: 'schema', label: 'Input Schema', icon: 'schema' },
            { id: 'tests', label: 'Regression Tests', icon: 'fact_check' },
            { id: 'audit', label: 'Dual-Gate Audit', icon: 'insights' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center space-x-1.5 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto font-mono text-xs text-on-surface bg-surface-container-lowest">
          {activeTab === 'code' && (
            <pre className="whitespace-pre-wrap leading-relaxed select-all">
              {tool.code || '# No implementation code available'}
            </pre>
          )}

          {activeTab === 'schema' && (
            <pre className="whitespace-pre-wrap leading-relaxed text-secondary select-all">
              {JSON.stringify(tool.schema || {}, null, 2)}
            </pre>
          )}

          {activeTab === 'tests' && (
            <pre className="whitespace-pre-wrap leading-relaxed text-on-surface-variant select-all">
              {tool.tests_code || '# No automated regression tests stored for this tool.'}
            </pre>
          )}

          {activeTab === 'audit' && (
            <div className="font-sans space-y-4 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                  <div className="text-xs text-on-surface-variant">Dual-Gate Score</div>
                  <div className="text-xl font-bold text-primary mt-1">
                    {Math.round((tool.gate_score || 0) * 100)}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                  <div className="text-xs text-on-surface-variant">Reuses</div>
                  <div className="text-xl font-bold text-on-surface mt-1">
                    {tool.reuse_count || 0}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                  <div className="text-xs text-on-surface-variant">Success Rate</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    {Math.round((tool.success_rate || 0) * 100)}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20">
                  <div className="text-xs text-on-surface-variant">Status</div>
                  <div className="text-xl font-bold capitalize text-on-surface mt-1">
                    {tool.status || 'Active'}
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-on-surface-variant">
                <div>
                  <span className="font-medium text-on-surface">Registered At:</span>{' '}
                  {tool.created_at ? new Date(tool.created_at).toLocaleString() : 'N/A'}
                </div>
                <div>
                  <span className="font-medium text-on-surface">Last Evaluated / Used:</span>{' '}
                  {tool.last_used_at ? new Date(tool.last_used_at).toLocaleString() : 'Never'}
                </div>
                <div>
                  <span className="font-medium text-on-surface">Namespace Identifier:</span>{' '}
                  <span className="font-mono text-outline">{tool.id}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ToolDetailModal;

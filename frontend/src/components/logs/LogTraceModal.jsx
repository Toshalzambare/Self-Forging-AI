import React, { useEffect, useState } from 'react';

const LogTraceModal = ({ isOpen, log, onClose, showToast }) => {
  const [activeTab, setActiveTab] = useState('trace'); // 'trace' | 'json'

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !log) return null;

  let parsed = {};
  let rawTrace = '';
  let violations = [];
  try {
    parsed = typeof log.details === 'string' ? JSON.parse(log.details) : (log.details || {});
    rawTrace = parsed.logs || parsed.trace || parsed.sandbox_results || parsed.summary || log.details;
    violations = parsed.violations || [];
  } catch (_) {
    rawTrace = log.details || '';
  }

  const handleCopy = (text, label) => {
    navigator.clipboard.writeText(text);
    showToast?.('Copied to Clipboard', `${label} copied.`);
  };

  const isError = log.status === 'failed' || log.status === 'error' || log.status === 'security_violation';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-3xl rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-outline-variant/20 bg-surface-container/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isError ? 'bg-error-container/20 text-error' : 'bg-primary-container/20 text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">terminal</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm text-on-surface flex items-center gap-2">
                <span>{log.action}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-mono font-semibold ${
                    isError ? 'bg-error/10 text-error border border-error/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}
                >
                  {log.status}
                </span>
              </h3>
              <p className="text-[11px] text-on-surface-variant font-mono mt-0.5">
                Session: {log.session_id || 'N/A'} • {log.created_at ? new Date(log.created_at).toLocaleString() : ''}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Violations Warning Banner */}
        {violations.length > 0 && (
          <div className="px-5 py-3 bg-error-container/15 border-b border-error/20 text-xs text-error space-y-1">
            <div className="flex items-center space-x-1.5 font-semibold">
              <span className="material-symbols-outlined text-[16px]">security</span>
              <span>Admission Gate Violations Detected</span>
            </div>
            <ul className="list-disc list-inside text-[11px] font-mono space-y-0.5 pl-1">
              {violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-outline-variant/10 text-xs">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('trace')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'trace' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Execution Trace / Stdout
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'json' ? 'bg-primary text-on-primary' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Raw Payload JSON
            </button>
          </div>

          <button
            onClick={() =>
              handleCopy(activeTab === 'trace' ? rawTrace : JSON.stringify(parsed, null, 2), activeTab === 'trace' ? 'Trace' : 'JSON')
            }
            className="text-primary hover:underline flex items-center space-x-1 text-xs"
          >
            <span className="material-symbols-outlined text-[15px]">content_copy</span>
            <span>Copy</span>
          </button>
        </div>

        {/* Content Viewer */}
        <div className="flex-1 p-5 overflow-y-auto custom-scrollbar">
          {activeTab === 'trace' ? (
            <pre className="p-4 rounded-xl bg-surface-container-lowest text-xs font-mono text-on-surface whitespace-pre-wrap leading-relaxed border border-outline-variant/20 max-h-96 overflow-x-auto custom-scrollbar">
              {rawTrace || 'No stdout/stderr traces recorded for this action.'}
            </pre>
          ) : (
            <pre className="p-4 rounded-xl bg-surface-container-lowest text-xs font-mono text-on-surface-variant whitespace-pre-wrap leading-relaxed border border-outline-variant/20 max-h-96 overflow-x-auto custom-scrollbar">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-outline-variant/20 bg-surface-container/60 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-medium text-on-surface transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogTraceModal;

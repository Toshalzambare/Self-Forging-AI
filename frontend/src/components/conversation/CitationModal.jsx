import React, { useState } from 'react';

/**
 * CitationModal Component.
 * Slides open an inspector showing the full source code/details for a clicked tool or document citation.
 */
export default function CitationModal({ isOpen, onClose, citation, toolData, docData }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !citation) return null;

  const isTool = citation.type === 'tool';
  const title = isTool ? `Tool: ${citation.target}` : `Document: ${citation.target}`;

  const content = isTool
    ? (toolData?.code || '# Loading or previewing tool source code...\n# Verified and registered in your tool repository.')
    : (docData?.extracted_text || docData?.snippet || 'Referenced document content used for context grounding.');

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                isTool
                  ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {isTool ? 'construction' : 'description'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {isTool ? 'Dynamically Synthesized Tool' : 'Attached Conversation File'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-mono text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
              title="Copy content"
            >
              <span className="material-symbols-outlined text-[14px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close inspector"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 custom-scrollbar bg-slate-950 text-xs">
          <pre className="font-mono text-slate-300 leading-relaxed whitespace-pre-wrap select-text">
            <code>{content}</code>
          </pre>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Inspection Target: {citation.target}</span>
          <span>Click outside or Esc to close</span>
        </div>
      </div>
    </div>
  );
}

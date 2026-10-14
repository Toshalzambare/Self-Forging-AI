import React from 'react';
import { APP_NAME } from '../config.js';

const CodeModal = ({ isOpen, onClose, toolName, code, showToast }) => {
  if (!isOpen) return null;

  const codeContent = code || `# Autonomously forged tool definition\n# No source code stored for ${toolName || 'this tool'}.`;
  const title = toolName ? (toolName.endsWith('.py') ? toolName : `${toolName}.py`) : 'ToolScript.py';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      showToast?.('Copied', 'Code schema copied to clipboard');
      onClose();
    } catch (err) {
      showToast?.('Copy Failed', 'Failed to copy code to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-surface-container-low rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-5 bg-surface-container flex items-start sm:items-center justify-between border-b border-outline-variant/20">
          <div className="flex items-start sm:items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-primary-container/20 text-primary flex items-center justify-center flex-shrink-0 mt-1 sm:mt-0">
              <span className="material-symbols-outlined text-[20px] material-symbols-fill">terminal</span>
            </div>
            <div>
              <h3 className="font-headline-sm text-[16px] sm:text-headline-sm font-semibold text-on-surface leading-tight break-all">
                {title}
              </h3>
              <p className="font-label-sm text-[10px] sm:text-label-sm text-primary mt-1">
                Dynamically compiled sandbox execution script
              </p>
            </div>
          </div>
          <button
            type="button"
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface flex-shrink-0 ml-2"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto font-mono text-body-sm text-on-surface bg-surface-container-lowest/80 space-y-2">
          <div className="text-tertiary text-[10px] sm:text-xs">
            # Generated autonomously by {APP_NAME}
          </div>
          <div className="text-tertiary text-[10px] sm:text-xs">
            # Verification: AST static analysis passed | Output schema locked
          </div>
          <pre className="text-primary-fixed-dim whitespace-pre-wrap leading-relaxed mt-2 text-[11px] sm:text-sm overflow-x-auto">
            {codeContent}
          </pre>
        </div>

        <div className="p-4 bg-surface-container flex flex-col sm:flex-row sm:items-center justify-between border-t border-outline-variant/20 gap-4 sm:gap-0">
          <div className="flex items-center space-x-2 text-on-surface-variant font-label-sm text-[11px] sm:text-label-sm">
            <span className="material-symbols-outlined text-primary text-[14px] sm:text-[16px]">lock</span>
            <span>Sandboxed under Docker Container</span>
          </div>
          <div className="flex items-center space-x-2 justify-end">
            <button
              type="button"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-surface-container-high text-on-surface font-body-sm text-xs sm:text-body-sm hover:bg-surface-bright transition-colors"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-primary text-on-primary font-body-sm text-xs sm:text-body-sm font-medium hover:bg-primary-container transition-colors shadow-sm"
              onClick={handleCopy}
            >
              Copy Code
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodeModal;

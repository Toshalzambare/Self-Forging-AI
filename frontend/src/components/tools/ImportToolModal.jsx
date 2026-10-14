import React, { useState, useRef } from 'react';
import { apiFetch } from '../../config.js';

/**
 * ImportToolModal:
 * Drag-and-drop or file selector for .sfatool packages.
 * Validates payload on the client, submits to the AST Security Gate endpoint,
 * and reports admission or violation feedback.
 */
const ImportToolModal = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [fileContent, setFileContent] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileProcess = (file) => {
    if (!file) return;
    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!parsed.sfa_version || !parsed.meta || !parsed.code) {
          throw new Error('Not a valid .sfatool package. Missing sfa_version, meta, or code.');
        }
        setFileContent(parsed);
      } catch (err) {
        setError(err.message || 'Failed to parse .sfatool JSON package.');
        setFileContent(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleImportSubmit = async () => {
    if (!fileContent) return;
    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/tools/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileContent),
      });

      if (showToast) {
        showToast('Tool Imported', res.message || 'Tool admitted and hot-swapped into registry.');
      }
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Import failed AST security profiling.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-surface-container rounded-2xl border border-outline-variant/30 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <span className="material-symbols-outlined text-primary text-[24px]">
              upload_file
            </span>
            <h2 className="text-lg font-semibold text-on-surface font-headline-sm">
              Import .sfatool Package
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <p className="text-xs text-on-surface-variant leading-relaxed">
          Import a portable tool into your personal namespace. Every imported tool passes through the{' '}
          <strong className="text-on-surface">AST Security Profiling Gate</strong> to verify code safety before registration.
        </p>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-outline-variant/40 hover:border-primary/60 rounded-xl p-8 text-center cursor-pointer transition-colors bg-surface-container-low hover:bg-surface-container-high/40 flex flex-col items-center justify-center space-y-2"
        >
          <span className="material-symbols-outlined text-primary text-[36px]">
            cloud_upload
          </span>
          <div className="text-sm font-medium text-on-surface">
            {fileName ? fileName : 'Click to browse or drop .sfatool here'}
          </div>
          <p className="text-[11px] text-outline">Accepts .sfatool or JSON tool definitions</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".sfatool,.json"
            className="hidden"
            onChange={(e) => handleFileProcess(e.target.files[0])}
          />
        </div>

        {/* Package Preview */}
        {fileContent && (
          <div className="p-3.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20 space-y-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary">{fileContent.meta?.name}</span>
              <span className="font-mono text-[10px] text-outline">v{fileContent.sfa_version}</span>
            </div>
            <p className="text-on-surface-variant line-clamp-2">
              {fileContent.meta?.description || 'No description in package.'}
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-error/10 border border-error/30 text-error text-xs flex items-start space-x-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">gpp_bad</span>
            <div className="leading-snug">{error}</div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!fileContent || loading}
            onClick={handleImportSubmit}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center space-x-1.5 shadow-md shadow-primary/20"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Verifying AST Gate...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">verified</span>
                <span>Verify &amp; Import</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportToolModal;

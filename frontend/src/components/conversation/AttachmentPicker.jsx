import React, { useRef } from 'react';

const formatBytes = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const AttachmentPicker = ({
  attachments = [],
  onUploadFile,
  onRemoveAttachment,
  isUploading = false,
  disabled = false,
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    files.forEach((file) => onUploadFile?.(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.json,.csv,.py"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />

      {/* Trigger Button (Paperclip) */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isUploading}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:bg-slate-800/80 transition disabled:opacity-40 disabled:cursor-not-allowed"
        title="Attach document (PDF, Text, CSV, JSON, Python)"
      >
        <span className="material-symbols-outlined text-[20px]">
          {isUploading ? 'progress_activity' : 'attach_file'}
        </span>
      </button>
    </div>
  );
};

export const AttachmentPreviewBar = ({ attachments = [], onRemoveAttachment, isUploading = false }) => {
  if (!attachments.length && !isUploading) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 pt-2 pb-1 border-b border-slate-800/60 w-full animate-fadeIn">
      {attachments.map((att) => (
        <div
          key={att.id || att.filename}
          className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700/60 text-xs text-slate-200 shadow-sm"
        >
          <span className="material-symbols-outlined text-[15px] text-indigo-400">
            {att.filename?.endsWith('.pdf') ? 'picture_as_pdf' : 'description'}
          </span>
          <span className="truncate max-w-[140px] text-[11px] font-medium" title={att.filename}>
            {att.filename}
          </span>
          <span className="text-[10px] text-slate-400">({formatBytes(att.size_bytes || att.size)})</span>
          <button
            type="button"
            onClick={() => onRemoveAttachment?.(att.id || att.filename)}
            className="w-4 h-4 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition ml-0.5"
            title="Remove attachment"
          >
            <span className="material-symbols-outlined text-[12px]">close</span>
          </button>
        </div>
      ))}

      {isUploading && (
        <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 animate-pulse">
          <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
          <span className="text-[11px]">Uploading document...</span>
        </div>
      )}
    </div>
  );
};

export default AttachmentPicker;

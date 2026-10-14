import React from 'react';

const formatFileSize = (bytes) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const getFileIcon = (filename = '', contentType = '') => {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf') || contentType.includes('pdf')) {
    return { icon: 'picture_as_pdf', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  }
  if (lower.endsWith('.json') || contentType.includes('json')) {
    return { icon: 'data_object', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
  }
  if (lower.endsWith('.csv') || contentType.includes('csv')) {
    return { icon: 'table_chart', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
  }
  if (lower.endsWith('.py') || lower.endsWith('.js') || lower.endsWith('.ts')) {
    return { icon: 'code', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' };
  }
  return { icon: 'description', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' };
};

const AttachmentBadge = ({ attachment }) => {
  if (!attachment) return null;
  const { icon, color } = getFileIcon(attachment.filename, attachment.content_type);

  return (
    <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-sm text-xs text-slate-200 mt-2 max-w-full">
      <div className={`w-6 h-6 rounded-lg flex items-center justify-center border ${color}`}>
        <span className="material-symbols-outlined text-[15px]">{icon}</span>
      </div>
      <div className="flex flex-col min-w-0 pr-1">
        <span className="font-medium truncate max-w-[200px] sm:max-w-[260px]" title={attachment.filename}>
          {attachment.filename}
        </span>
        <span className="text-[10px] text-slate-400 leading-none">
          {formatFileSize(attachment.size_bytes || attachment.size)}
        </span>
      </div>
    </div>
  );
};

export default AttachmentBadge;

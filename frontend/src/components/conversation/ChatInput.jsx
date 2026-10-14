import React, { useRef, useEffect } from 'react';

const ChatInput = ({ value, onChange, onSend, isLoading, placeholder }) => {
  const textareaRef = useRef(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl p-2 relative flex items-end">
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Ask a question or request a capability to forge... (Shift + Enter for new line)'}
        disabled={isLoading}
        className="flex-1 bg-transparent border-0 px-3 py-2 text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none resize-none max-h-40 custom-scrollbar disabled:opacity-50"
      />

      <div className="flex items-center space-x-1 pl-2 pb-0.5">
        <button
          type="button"
          onClick={onSend}
          disabled={!value.trim() || isLoading}
          className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition active:scale-95"
          title="Send message"
        >
          {isLoading ? (
            <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
          ) : (
            <span className="material-symbols-outlined text-[18px]">send</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default ChatInput;

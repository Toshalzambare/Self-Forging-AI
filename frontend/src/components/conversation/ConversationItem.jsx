import React, { useState, useRef, useEffect } from 'react';

const ConversationItem = ({
  conversation,
  isSelected,
  onSelect,
  onRename,
  onTogglePin,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(conversation.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const inputRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  // Close popup menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleSaveRename = (e) => {
    e.preventDefault();
    if (editTitle.trim() && editTitle.trim() !== conversation.title) {
      onRename(conversation.id, editTitle.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setEditTitle(conversation.title);
      setIsEditing(false);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !isEditing && onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (!isEditing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onSelect(conversation.id);
        }
      }}
      className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500/50 ${
        isSelected
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
      }`}
    >
      <div className="flex items-center space-x-2.5 min-w-0 flex-1">
        <span className="material-symbols-outlined text-[16px] flex-shrink-0 text-slate-500 group-hover:text-slate-300">
          {conversation.is_pinned ? 'push_pin' : 'chat_bubble_outline'}
        </span>

        {isEditing ? (
          <form onSubmit={handleSaveRename} className="flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveRename}
              onKeyDown={handleKeyDown}
              className="w-full bg-slate-900 border border-indigo-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
            />
          </form>
        ) : (
          <span className="truncate flex-1" title={conversation.title}>
            {conversation.title}
          </span>
        )}
      </div>

      {/* Action Trigger Button */}
      {!isEditing && (
        <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition opacity-0 group-hover:opacity-100 focus:opacity-100 ${
              menuOpen ? 'opacity-100 bg-slate-700/50' : ''
            }`}
            title="Chat actions"
          >
            <span className="material-symbols-outlined text-[16px]">more_vert</span>
          </button>

          {/* Popup Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-7 w-36 bg-slate-900 border border-slate-700/70 rounded-xl shadow-2xl py-1 z-30 animate-fadeIn backdrop-blur-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  setIsEditing(true);
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-indigo-600/20 hover:text-white transition"
              >
                <span className="material-symbols-outlined text-[14px]">edit</span>
                <span>Rename</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onTogglePin(conversation.id, conversation.is_pinned);
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-slate-300 hover:bg-indigo-600/20 hover:text-white transition"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {conversation.is_pinned ? 'keep_off' : 'push_pin'}
                </span>
                <span>{conversation.is_pinned ? 'Unpin' : 'Pin to top'}</span>
              </button>

              <div className="border-t border-slate-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(conversation.id);
                }}
                className="w-full flex items-center space-x-2 px-3 py-1.5 text-xs text-rose-400 hover:bg-rose-500/20 transition"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default React.memo(ConversationItem, (prevProps, nextProps) => {
  return (
    prevProps.conversation.id === nextProps.conversation.id &&
    prevProps.conversation.title === nextProps.conversation.title &&
    prevProps.conversation.is_pinned === nextProps.conversation.is_pinned &&
    prevProps.conversation.updated_at === nextProps.conversation.updated_at &&
    prevProps.isSelected === nextProps.isSelected
  );
});

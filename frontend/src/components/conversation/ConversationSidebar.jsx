import React, { useState } from 'react';
import ConversationItem from './ConversationItem.jsx';

function categorizeByDate(convs) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfLast7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const groups = {
    today: [],
    yesterday: [],
    last7Days: [],
    older: [],
  };

  convs.forEach((c) => {
    const timestamp = c.last_message_at || c.updated_at || c.created_at;
    const time = timestamp ? new Date(timestamp).getTime() : 0;
    if (time >= startOfToday) {
      groups.today.push(c);
    } else if (time >= startOfYesterday) {
      groups.yesterday.push(c);
    } else if (time >= startOfLast7Days) {
      groups.last7Days.push(c);
    } else {
      groups.older.push(c);
    }
  });

  return [
    { label: 'Today', items: groups.today },
    { label: 'Yesterday', items: groups.yesterday },
    { label: 'Previous 7 Days', items: groups.last7Days },
    { label: 'Older', items: groups.older },
  ].filter((g) => g.items.length > 0);
}

const ConversationSidebar = ({
  isOpen,
  onClose,
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onRenameConversation,
  onTogglePin,
  onDeleteConversation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pinned = filtered.filter((c) => c.is_pinned);
  const unpinned = filtered.filter((c) => !c.is_pinned);
  const dateGroups = categorizeByDate(unpinned);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-72 bg-slate-950/95 border-r border-slate-800/80 transform transition-transform duration-300 ease-in-out md:transform-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:hidden'
        } shrink-0`}
      >
        {/* Sidebar Header & New Chat Button */}
        <div className="p-3.5 border-b border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-[18px] text-indigo-400">forum</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Chats</span>
            </div>
            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="md:hidden p-1 text-slate-400 hover:text-slate-200 rounded-lg"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onNewChat}
            className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl shadow-md shadow-indigo-600/20 text-xs font-semibold transition active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>New Conversation</span>
          </button>

          {/* Search Bar */}
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 material-symbols-outlined text-[16px] text-slate-500">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full bg-slate-900 border border-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Scrollable Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4 text-xs text-slate-500">
              <span className="material-symbols-outlined text-[28px] text-slate-600 mb-1">chat</span>
              <p>No conversations yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Start a new chat to begin.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-6 px-4 text-xs text-slate-500">
              <p>No matching chats found.</p>
            </div>
          ) : (
            <>
              {/* Pinned Chats */}
              {pinned.length > 0 && (
                <div className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Pinned
                  </div>
                  {pinned.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isSelected={conv.id === activeId}
                      onSelect={(id) => {
                        onSelectConversation(id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      onRename={onRenameConversation}
                      onTogglePin={onTogglePin}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              )}

              {/* Date Grouped Chats */}
              {dateGroups.map((group) => (
                <div key={group.label} className="space-y-1">
                  <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 mt-2">
                    {group.label}
                  </div>
                  {group.items.map((conv) => (
                    <ConversationItem
                      key={conv.id}
                      conversation={conv}
                      isSelected={conv.id === activeId}
                      onSelect={(id) => {
                        onSelectConversation(id);
                        if (window.innerWidth < 768) onClose();
                      }}
                      onRename={onRenameConversation}
                      onTogglePin={onTogglePin}
                      onDelete={onDeleteConversation}
                    />
                  ))}
                </div>
              ))}
            </>
          )}
        </div>
      </aside>
    </>
  );
};

export default ConversationSidebar;

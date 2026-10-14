import React, { useRef, useEffect, useState } from 'react';
import ConversationSidebar from '../components/conversation/ConversationSidebar.jsx';
import ChatMessage from '../components/conversation/ChatMessage.jsx';
import ChatInput from '../components/conversation/ChatInput.jsx';
import EmptyChatStarters from '../components/conversation/EmptyChatStarters.jsx';
import ForgeStateBanner from '../components/conversation/ForgeStateBanner.jsx';
import { useConversationManager } from '../components/conversation/useConversationManager.js';

const ConversationPage = ({
  selectedModel,
  onOpenModelModal,
  onToggleLogsDrawer,
  showToast,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const {
    conversations,
    activeId,
    messages,
    isLoadingMessages,
    isSending,
    activeForgeState,
    backendStatus,
    isSidebarOpen,
    setIsSidebarOpen,
    selectConversation,
    createConversation,
    renameConversation,
    togglePin,
    deleteConversation,
    sendMessage,
  } = useConversationManager(showToast);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeForgeState]);

  const handleSend = () => {
    if (!inputText.trim() || isSending) return;
    const text = inputText;
    setInputText('');
    sendMessage(text);
  };

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="flex h-[calc(100dvh-4rem)] pt-16 overflow-hidden bg-slate-950 text-slate-100">
      {/* Collapsible Left Sidebar */}
      <ConversationSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={selectConversation}
        onNewChat={() => createConversation('New Conversation')}
        onRenameConversation={renameConversation}
        onTogglePin={togglePin}
        onDeleteConversation={deleteConversation}
      />

      {/* Main Conversation Stream */}
      <main className="flex-1 flex flex-col min-w-0 h-full relative">
        {/* Top Chat Bar */}
        <header className="h-12 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-lg transition"
              title={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            >
              <span className="material-symbols-outlined text-[20px]">
                {isSidebarOpen ? 'left_panel_close' : 'left_panel_open'}
              </span>
            </button>

            <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate max-w-[150px] sm:max-w-xs">
              {activeConv ? activeConv.title : 'New Chat'}
            </span>

            {/* Backend Status indicator */}
            <div
              className={`hidden sm:inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                backendStatus === 'online'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : backendStatus === 'offline'
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendStatus === 'online'
                    ? 'bg-emerald-400 animate-pulse'
                    : backendStatus === 'offline'
                    ? 'bg-rose-400'
                    : 'bg-slate-400 animate-pulse'
                }`}
              />
              <span>{backendStatus === 'online' ? 'Online' : backendStatus === 'offline' ? 'Offline' : 'Checking'}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              type="button"
              onClick={onOpenModelModal}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-xs text-slate-300 border border-slate-800 transition"
              title="Select LLM model"
            >
              <span className="material-symbols-outlined text-[15px] text-indigo-400">tune</span>
              <span className="truncate max-w-[80px] sm:max-w-[120px]">{selectedModel}</span>
            </button>

            <button
              type="button"
              onClick={onToggleLogsDrawer}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition"
              title="View live action logs"
            >
              <span className="material-symbols-outlined text-[20px]">browse_activity</span>
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-6 md:px-8 py-6 custom-scrollbar">
          <div className="max-w-4xl mx-auto w-full">
            {isLoadingMessages ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
                <span className="material-symbols-outlined text-[32px] animate-spin text-indigo-400">sync</span>
                <span className="text-xs">Loading conversation history...</span>
              </div>
            ) : messages.length === 0 ? (
              <EmptyChatStarters onSelectPrompt={(p) => sendMessage(p)} />
            ) : (
              <>
                {messages.map((m) => (
                  <ChatMessage key={m.id} message={m} onRetry={() => sendMessage(m.content)} />
                ))}

                {/* Animated Forge Reasoning Banner */}
                {activeForgeState && <ForgeStateBanner state={activeForgeState} />}
              </>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Floating Input Area */}
        <div className="p-3 sm:p-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-slate-950 via-slate-950/95 to-transparent shrink-0">
          <div className="max-w-4xl mx-auto w-full">
            <ChatInput
              value={inputText}
              onChange={setInputText}
              onSend={handleSend}
              isLoading={isSending}
              placeholder={
                backendStatus === 'offline'
                  ? 'Backend offline — ensure backend server is running'
                  : 'Ask anything or describe a capability to autonomously forge...'
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConversationPage;

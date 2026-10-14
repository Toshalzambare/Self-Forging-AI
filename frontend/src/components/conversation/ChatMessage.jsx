import React, { useState } from 'react';
import CodeArtifactCard from './CodeArtifactCard.jsx';
import ForgeStateBanner from './ForgeStateBanner.jsx';

const ChatMessage = ({ message, onRetry }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const isLoading = message.isLoading;

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content || message.text || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedTime = message.created_at
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : message.time || '';

  const forgeData = message.forge_data || {};
  const forgedTool = forgeData.forged_tool || message.forgedTool;
  const sandboxResults = forgeData.sandbox_results || message.sandboxResults;
  const testsPassed = forgeData.tests_passed !== undefined ? forgeData.tests_passed : message.testsPassed;
  const repairAttempts = forgeData.repair_attempts || message.repairAttempts || 0;

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn mb-5`}>
      <div className={`flex max-w-[92%] sm:max-w-[85%] md:max-w-[80%] space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div
          className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-md ${
            isUser
              ? 'bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white'
              : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white border border-purple-400/20'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">
            {isUser ? 'person' : 'auto_awesome'}
          </span>
        </div>

        {/* Message Content Container */}
        <div className="flex-1 min-w-0">
          {/* Header (Role & Time) */}
          <div className={`flex items-center space-x-2 mb-1 text-[11px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span className="font-semibold text-slate-400">{isUser ? 'You' : 'Self-Forging Agent'}</span>
            {formattedTime && <span>• {formattedTime}</span>}
          </div>

          {/* Bubble Body */}
          <div
            className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
              isUser
                ? 'bg-indigo-600 text-white rounded-tr-sm shadow-lg shadow-indigo-600/10'
                : 'bg-slate-900/90 text-slate-200 border border-slate-800 rounded-tl-sm shadow-xl backdrop-blur-md'
            }`}
          >
            {isLoading ? (
              <div className="flex items-center space-x-2 text-slate-400 py-1">
                <span className="material-symbols-outlined text-[18px] animate-spin text-indigo-400">
                  sync
                </span>
                <span className="text-xs">Reasoning and analyzing capabilities...</span>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">
                {message.content || message.text}
              </div>
            )}

            {/* Error Message & Retry */}
            {message.isError && (
              <div className="mt-3 flex items-center space-x-2 text-rose-300 text-xs">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>Generation interrupted.</span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="ml-2 underline hover:text-white"
                  >
                    Retry
                  </button>
                )}
              </div>
            )}

            {/* In-Chat Forge Artifact (synthesized code + tests) */}
            {(forgedTool || sandboxResults) && (
              <CodeArtifactCard
                tool={forgedTool}
                sandboxResults={sandboxResults}
                testsPassed={testsPassed}
                repairAttempts={repairAttempts}
              />
            )}
          </div>

          {/* Footer Actions */}
          {!isLoading && !message.isError && (
            <div className={`flex items-center space-x-2 mt-1.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center space-x-1 transition px-1 py-0.5 rounded"
                title="Copy message"
              >
                <span className="material-symbols-outlined text-[13px]">
                  {copied ? 'check' : 'content_copy'}
                </span>
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

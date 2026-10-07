import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL, apiFetch, APP_NAME } from '../config.js';

const ConversationPage = ({ onOpenModelModal, onToggleLogsDrawer, showToast, selectedModel }) => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const [messages, setMessages] = useState([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState('Autonomous');
  const [webSearchOn, setWebSearchOn] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking'); // 'online' | 'offline' | 'checking'

  // Check backend health on mount
  useEffect(() => {
    apiFetch('/health')
      .then(d => setBackendStatus(d.status === 'healthy' ? 'online' : 'offline'))
      .catch(() => setBackendStatus('offline'));
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputMsg.trim() || isLoading) return;

    const userMsg = {
      id: Date.now(),
      role: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inputMsg.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInputMsg('');
    setIsLoading(true);

    // Add a loading placeholder
    const loadingId = Date.now() + 1;
    setMessages(prev => [...prev, {
      id: loadingId,
      role: 'assistant',
      isLoading: true,
    }]);

    try {
      const data = await apiFetch('/api/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: userMsg.text,
          session_id: sessionId,
        }),
      });
      setSessionId(data.session_id);

      const aiMsg = {
        id: loadingId,
        role: 'assistant',
        isLoading: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: data.reply,
        isToolForged: data.is_tool_forged,
        forgedTool: data.forged_tool,
        sandboxResults: data.sandbox_results,
        testsPassed: data.tests_passed,
        repairAttempts: data.repair_attempts,
      };

      setMessages(prev => prev.map(m => m.id === loadingId ? aiMsg : m));

      if (data.is_tool_forged) {
        showToast('Tool Forged!', 'Agent successfully created and tested a new tool.');
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === loadingId ? {
        id: loadingId,
        role: 'assistant',
        isLoading: false,
        isError: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Connection error: ${err.message}. Make sure the backend server is running.`,
      } : m));
      showToast('Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="pt-20 pb-4 flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 md:px-8 relative min-h-[calc(100vh-4rem)]">

      {/* Top Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4 shrink-0">
        <div className="flex items-center space-x-3">
          {/* Backend Status */}
          <div className={`px-2.5 py-1 rounded-full border text-xs font-medium flex items-center space-x-1.5 ${
            backendStatus === 'online'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : backendStatus === 'offline'
              ? 'bg-red-500/10 border-red-500/30 text-red-400'
              : 'bg-outline/10 border-outline/30 text-outline'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              backendStatus === 'online' ? 'bg-emerald-400 animate-pulse' :
              backendStatus === 'offline' ? 'bg-red-400' : 'bg-outline animate-pulse'
            }`} />
            <span>
              {backendStatus === 'online' ? 'Agent Online' :
               backendStatus === 'offline' ? 'Backend Offline' : 'Connecting...'}
            </span>
          </div>
          {sessionId && (
            <span className="text-xs text-on-surface-variant hidden sm:inline font-mono truncate max-w-[160px]">
              Session: {sessionId.slice(0, 8)}…
            </span>
          )}
        </div>
        <button
          onClick={onToggleLogsDrawer}
          className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-surface-container"
        >
          <span className="material-symbols-outlined text-[15px]">browse_activity</span>
          <span>Live actions</span>
        </button>
      </div>

      {/* Chat Stream */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-36">

        {/* Empty State */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full py-24 space-y-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-container/20 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px] text-primary material-symbols-fill">auto_awesome</span>
            </div>
            <div>
              <h2 className="text-on-surface font-semibold text-lg">{APP_NAME}</h2>
              <p className="text-on-surface-variant text-sm mt-1 max-w-sm">
                Ask me anything. If I lack a capability, I'll forge a tool, test it, and use it — automatically.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-lg">
              {[
                "Scrape the text content from a URL",
                "Fetch JSON from an API endpoint",
                "Calculate compound interest over time",
                "What is 2 + 2?",
              ].map(s => (
                <button
                  key={s}
                  onClick={() => setInputMsg(s)}
                  className="text-left px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant/30 text-sm text-on-surface-variant hover:text-on-surface hover:border-primary/40 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id}>
            {/* User Message */}
            {msg.role === 'user' && (
              <div className="flex justify-end">
                <div className="max-w-xl bg-surface-container-high border border-outline-variant/40 rounded-2xl rounded-tr-sm px-5 py-3.5 shadow-sm">
                  <div className="text-[11px] text-outline mb-1 font-medium flex items-center justify-end space-x-1.5">
                    <span>You</span><span>•</span><span>{msg.time}</span>
                  </div>
                  <p className="text-body-md text-on-surface leading-relaxed">{msg.text}</p>
                </div>
              </div>
            )}

            {/* AI Message */}
            {msg.role === 'assistant' && (
              <div className="flex items-start space-x-3.5 max-w-3xl">
                <div className="w-8 h-8 rounded-xl bg-primary-container/20 border border-primary/30 flex items-center justify-center shrink-0 mt-1">
                  <span className="material-symbols-outlined text-[18px] text-primary material-symbols-fill">auto_awesome</span>
                </div>
                <div className="flex-1 space-y-3">

                  {/* Loading state */}
                  {msg.isLoading && (
                    <div className="flex items-center space-x-2.5 py-2">
                      <div className="flex space-x-1">
                        {[0,1,2].map(i => (
                          <span key={i} className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{animationDelay: `${i * 0.15}s`}} />
                        ))}
                      </div>
                      <span className="text-xs text-on-surface-variant">Agent is thinking...</span>
                    </div>
                  )}

                  {/* Error state */}
                  {msg.isError && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3">
                      <p className="text-sm text-red-400">{msg.text}</p>
                    </div>
                  )}

                  {/* Normal reply */}
                  {!msg.isLoading && !msg.isError && (
                    <>
                      <div className="flex items-center space-x-2 text-xs text-on-surface-variant">
                        <span className="font-semibold text-primary">{APP_NAME}</span>
                        <span className="text-outline">•</span>
                        <span>{msg.time}</span>
                      </div>
                      <div className="text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">{msg.text}</div>

                      {/* Tool Forged Card */}
                      {msg.isToolForged && msg.forgedTool && (
                        <div className="bg-surface-container-low border border-primary/30 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-xl pointer-events-none" />
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-[18px]">build</span>
                              </div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <h4 className="text-body-sm font-semibold text-on-surface">Tool Forged Autonomously</h4>
                                  {msg.testsPassed
                                    ? <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">Verified ✓</span>
                                    : <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-300 text-[10px] font-medium border border-red-500/30">Tests Failed ✗</span>
                                  }
                                </div>
                                {msg.forgedTool.schema?.title && (
                                  <p className="text-xs text-on-surface-variant mt-0.5">
                                    Tool: <code className="text-primary font-mono text-[11px] bg-surface-container px-1 py-0.5 rounded">{msg.forgedTool.schema.title}</code>
                                  </p>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={() => navigate('/ecosystem-tools')}
                              className="text-xs text-primary hover:underline flex items-center space-x-0.5 font-medium"
                            >
                              <span>View Registry</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                            </button>
                          </div>

                          {/* Stats */}
                          <div className="mt-3 flex items-center space-x-4 text-xs text-on-surface-variant">
                            <span className="flex items-center space-x-1">
                              <span className="material-symbols-outlined text-[14px]">recycling</span>
                              <span>Repair attempts: {msg.repairAttempts ?? 0}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <span className="material-symbols-outlined text-[14px]">lab_panel</span>
                              <span>{msg.testsPassed ? 'All tests passed' : 'Tests failed'}</span>
                            </span>
                          </div>

                          {/* Code Preview */}
                          {msg.forgedTool.code && (
                            <details className="mt-3 group">
                              <summary className="text-xs text-primary cursor-pointer hover:underline flex items-center space-x-1">
                                <span className="material-symbols-outlined text-[14px]">code</span>
                                <span>View generated code</span>
                                <span className="material-symbols-outlined text-[12px] group-open:rotate-180 transition-transform">expand_more</span>
                              </summary>
                              <pre className="mt-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 text-[11px] text-secondary overflow-x-auto font-mono leading-relaxed max-h-48">
                                {msg.forgedTool.code}
                              </pre>
                            </details>
                          )}

                          {/* Sandbox logs */}
                          {msg.sandboxResults && (
                            <details className="mt-2 group">
                              <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-on-surface flex items-center space-x-1">
                                <span className="material-symbols-outlined text-[14px]">terminal</span>
                                <span>Sandbox logs</span>
                                <span className="material-symbols-outlined text-[12px] group-open:rotate-180 transition-transform">expand_more</span>
                              </summary>
                              <pre className="mt-2 bg-surface-container-lowest p-3 rounded-xl border border-outline-variant/20 text-[10px] text-on-surface-variant overflow-x-auto font-mono leading-relaxed max-h-48">
                                {msg.sandboxResults}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Input Dock */}
      <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl bg-surface-container-low/95 backdrop-blur-md rounded-2xl border border-outline-variant/40 p-3 shadow-xl z-20">
        <div className="relative">
          <textarea
            value={inputMsg}
            onChange={e => setInputMsg(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            disabled={isLoading || backendStatus === 'offline'}
            className="w-full bg-transparent border-0 resize-none text-on-surface placeholder:text-outline text-body-md focus:ring-0 px-2 py-1 disabled:opacity-50"
            placeholder={
              backendStatus === 'offline'
                ? 'Backend offline — start the server with: uvicorn main:app --reload'
                : 'Ask me anything, or describe a capability you need...'
            }
            rows="2"
          />
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 gap-2">
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            <button
              onClick={onOpenModelModal}
              className="flex items-center space-x-1 sm:space-x-1.5 px-1.5 sm:px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-on-surface-variant hover:text-on-surface border border-outline-variant/30 transition-colors"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${backendStatus === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className="max-w-[60px] sm:max-w-[100px] truncate">{selectedModel}</span>
            </button>

            <button
              onClick={() => setWebSearchOn(!webSearchOn)}
              className={`flex items-center space-x-1 px-1.5 sm:px-2 py-1 rounded-lg text-xs transition-colors ${webSearchOn ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-container text-on-surface-variant'}`}
            >
              <span className="material-symbols-outlined text-[14px]">public</span>
              <span className="hidden md:inline">{webSearchOn ? 'Web On' : 'Web Off'}</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 flex-shrink-0">
            <div className="hidden lg:flex items-center bg-surface-container-lowest p-0.5 rounded-lg border border-outline-variant/30 text-xs">
              {['Autonomous', 'Guided'].map(m => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2 py-0.5 rounded ${mode === m ? 'bg-primary-container/30 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'}`}
                >
                  {m}
                </button>
              ))}
            </div>

            <button
              onClick={handleSend}
              disabled={isLoading || !inputMsg.trim() || backendStatus === 'offline'}
              className="px-3 sm:px-4 py-1.5 bg-primary text-on-primary font-medium text-body-sm rounded-xl hover:bg-primary-container transition-all flex items-center space-x-1 sm:space-x-1.5 shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <span className="hidden sm:inline">Thinking</span>
                  <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <span className="material-symbols-outlined text-[14px] sm:text-[16px]">arrow_upward</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default ConversationPage;

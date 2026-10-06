import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ConversationPage = ({ onOpenModelModal, onToggleLogsDrawer, showToast, selectedModel }) => {
      const navigate = useNavigate();
      const [messages, setMessages] = useState([
        {
          id: 1,
          sender: 'user',
          time: '10:14 AM',
          text: 'Research and build an automated daily digest for market news and sync to Notion. Make sure to capture key macro headlines and summarize them clearly.'
        }
      ]);
      const [inputMsg, setInputMsg] = useState('');
      const [mode, setMode] = useState('Autonomous');
      const [webSearchOn, setWebSearchOn] = useState(true);

      const handleSend = () => {
        if (!inputMsg.trim()) return;
        const newMsg = {
          id: Date.now(),
          sender: 'user',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: inputMsg
        };
        setMessages([...messages, newMsg]);
        setInputMsg('');
        showToast('Task Queued', 'Twinkle companion scheduled autonomous workflow.');
      };

      return (
        <main className="pt-20 pb-4 flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 md:px-8 relative min-h-[calc(100vh-4rem)]">
          {/* Top Ambient Task Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 mb-4 shrink-0">
            <div className="flex items-center space-x-3">
              <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium flex items-center space-x-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                <span>Task in Progress</span>
              </div>
              <span className="text-xs text-on-surface-variant hidden sm:inline">Active goal: Market Digest &amp; Notion Sync</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={onToggleLogsDrawer}
                className="text-xs text-on-surface-variant hover:text-primary transition-colors flex items-center space-x-1 py-1 px-2 rounded-lg hover:bg-surface-container"
              >
                <span className="material-symbols-outlined text-[15px]">browse_activity</span>
                <span>Show live actions</span>
              </button>
            </div>
          </div>

          {/* Chat Stream (Scrollable) */}
          <div className="flex-1 overflow-y-auto space-y-6 pr-1 pb-36">
            {messages.map((msg) => (
              <div key={msg.id} className="flex justify-end">
                <div className="max-w-xl bg-surface-container-high border border-outline-variant/40 rounded-2xl rounded-tr-sm px-5 py-3.5 text-on-surface shadow-sm">
                  <div className="text-[11px] text-outline mb-1 font-medium flex items-center justify-end space-x-1.5">
                    <span>You</span>
                    <span>•</span>
                    <span>{msg.time}</span>
                  </div>
                  <p className="text-body-md text-on-surface leading-relaxed">
                    {msg.text}
                  </p>
                </div>
              </div>
            ))}

            {/* Twinkle Companion Response Block */}
            <div className="flex items-start space-x-3.5 max-w-3xl">
              <div className="w-8 h-8 rounded-xl bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary shrink-0 mt-1 shadow-sm">
                <span className="material-symbols-outlined text-[18px] text-primary material-symbols-fill">auto_awesome</span>
              </div>
              <div className="flex-1 space-y-4">
                <div className="flex items-center space-x-2 text-xs text-on-surface-variant">
                  <span className="font-semibold text-primary">Twinkle</span>
                  <span className="text-outline">•</span>
                  <span>Just now</span>
                </div>
                <div className="text-body-md text-on-surface leading-relaxed">
                  I'm on it! I've structured an autonomous workflow to gather the latest macroeconomic developments, synthesize the takeaways, and deliver a clean card to your Notion database.
                </div>

                {/* Friendly Milestone Checklist */}
                <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30 space-y-3">
                  <div className="flex items-center justify-between border-b border-outline-variant/20 pb-2">
                    <span className="text-xs font-semibold text-on-surface uppercase tracking-wider flex items-center space-x-1.5">
                      <span className="material-symbols-outlined text-[16px] text-primary">checklist</span>
                      <span>Task Breakdown</span>
                    </span>
                    <span className="text-xs text-primary font-medium">3 of 4 completed</span>
                  </div>
                  <div className="space-y-2 text-body-sm">
                    <div className="flex items-center space-x-2.5 text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                      <span className="line-through text-on-surface-variant">Gather top 10 market news sources via Web Research tool</span>
                    </div>
                    <div className="flex items-center space-x-2.5 text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                      <span className="line-through text-on-surface-variant">Synthesize macroeconomic trends and sentiment summary</span>
                    </div>
                    <div className="flex items-center space-x-2.5 text-on-surface">
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                      <span className="line-through text-on-surface-variant">Create and test custom Notion integration tool</span>
                    </div>
                    <div className="flex items-center space-x-2.5 text-primary font-medium">
                      <span className="material-symbols-outlined text-[18px] animate-spin text-primary">sync</span>
                      <span>Syncing structured digest card to your Notion workspace...</span>
                    </div>
                  </div>
                </div>

                {/* Autonomous Tool Created Card */}
                <div className="bg-surface-container-low border border-primary/30 rounded-2xl p-4 shadow-sm relative overflow-hidden">
                  <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full pointer-events-none blur-xl"></div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-lg bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-[18px]">build</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-body-sm font-semibold text-on-surface">Autonomous Tool Created</h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 text-[10px] font-medium border border-emerald-500/30">Verified &amp; Ready ✓</span>
                        </div>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          Synthesized new MCP capability <code className="text-primary font-mono text-[11px] bg-surface-container px-1 py-0.5 rounded">NotionDigestSync</code>
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/ecosystem-tools')}
                      className="text-xs text-primary hover:underline flex items-center space-x-0.5 font-medium"
                    >
                      <span>View in Registry</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-2.5 leading-relaxed">
                    Tested against your Notion API workspace key with clean validation. Schema includes tags, key tickers ($SPY, $QQQ, $TNX), and bullet summaries.
                  </p>
                </div>

                {/* Reasoning Accordion */}
                <details className="group bg-surface-container border border-outline-variant/30 rounded-2xl overflow-hidden transition-all duration-200" open>
                  <summary className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-surface-container-high transition-colors">
                    <div className="flex items-center space-x-2.5">
                      <span className="material-symbols-outlined text-[18px] text-primary">psychology</span>
                      <span className="text-body-sm font-medium text-on-surface">View Twinkle's Step-by-Step Reasoning &amp; Searches</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary">4 steps completed</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline group-open:rotate-180 transition-transform">expand_more</span>
                  </summary>
                  <div className="px-4 py-3.5 space-y-3 border-t border-outline-variant/20 bg-surface-container-low text-body-sm text-on-surface-variant">
                    <div className="flex items-start space-x-2.5">
                      <span className="text-primary font-mono text-xs mt-0.5 font-medium">01</span>
                      <div>
                        <span className="text-on-surface font-medium">Web Search Execution:</span>
                        <p className="text-xs mt-0.5">Queried <code>finance.yahoo.com/news</code> and <code>reuters.com/markets</code> for today's CPI prints and tech earnings.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="text-primary font-mono text-xs mt-0.5 font-medium">02</span>
                      <div>
                        <span className="text-on-surface font-medium">Data Filtering &amp; Deduplication:</span>
                        <p className="text-xs mt-0.5">Eliminated duplicate syndicate articles, normalized dates, and extracted 3 core themes: bond yields, tech guidance, and Federal Reserve commentary.</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-2.5">
                      <span className="text-primary font-mono text-xs mt-0.5 font-medium">03</span>
                      <div>
                        <span className="text-on-surface font-medium">Code Generation &amp; Self-Validation:</span>
                        <p className="text-xs mt-0.5">Generated Python tool function with automatic retry handling for rate limits.</p>
                        <div className="mt-2 bg-surface-container-lowest p-2.5 rounded-xl border border-outline-variant/20 font-mono text-[11px] text-secondary overflow-x-auto">
                          <span className="text-primary">def</span> <span className="text-on-surface">publish_notion_digest</span>(blocks, title=<span className="text-primary">"Daily Market Brief"</span>):<br/>
                          &nbsp;&nbsp;&nbsp;&nbsp;response = notion.pages.create(parent=&#123;<span className="text-secondary">"database_id"</span>: NOTION_DB&#125;, properties=create_props(title))<br/>
                          &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-primary">return</span> &#123;<span className="text-secondary">"success"</span>: True, <span className="text-secondary">"page_id"</span>: response[<span className="text-secondary">"id"</span>]&#125;
                        </div>
                      </div>
                    </div>
                  </div>
                </details>

                {/* Digest Preview Card */}
                <div className="bg-surface-container rounded-2xl p-4 border border-outline-variant/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary uppercase tracking-wide">Generated Daily Digest Preview</span>
                    <span className="text-xs text-outline">Today, 10:15 AM</span>
                  </div>
                  <h3 className="text-body-lg font-semibold text-on-surface">Morning Macro Brief: Markets Rally on Cooling Inflation Signals</h3>
                  <p className="text-body-sm text-on-surface-variant leading-relaxed">
                    Global equities edged higher this morning as benchmark 10-year Treasury yields stabilized at 4.28%. Major tech bellwethers showed resilient cloud margin performance, leading futures higher.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <span className="px-2 py-0.5 bg-surface-container-high rounded-md text-[11px] text-on-surface border border-outline-variant/30">Inflation #CPI</span>
                    <span className="px-2 py-0.5 bg-surface-container-high rounded-md text-[11px] text-on-surface border border-outline-variant/30">Macro Economy</span>
                    <span className="px-2 py-0.5 bg-surface-container-high rounded-md text-[11px] text-on-surface border border-outline-variant/30">Treasury Yields</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Floating Warm Bottom Prompt Dock */}
          <div className="fixed bottom-4 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-4xl bg-surface-container-low/95 backdrop-blur-md rounded-2xl border border-outline-variant/40 p-3 shadow-xl z-20">
            <div className="relative">
              <textarea
                value={inputMsg}
                onChange={(e) => setInputMsg(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full bg-transparent border-0 resize-none text-on-surface placeholder:text-outline text-body-md focus:ring-0 px-2 py-1"
                placeholder="Ask Twinkle to tackle any complex goal, summarize files, or automate tools..."
                rows="2"
              ></textarea>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20">
              <div className="flex items-center space-x-2">
                <button
                  onClick={onOpenModelModal}
                  className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs text-on-surface-variant hover:text-on-surface border border-outline-variant/30 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>{selectedModel}</span>
                </button>

                <button
                  onClick={() => showToast('Attachment', 'Document contextual reader ready (PDF/TXT/CSV).')}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
                  title="Attach documents or context"
                >
                  <span className="material-symbols-outlined text-[18px]">attach_file</span>
                </button>

                <button
                  onClick={() => setWebSearchOn(!webSearchOn)}
                  className={`flex items-center space-x-1 px-2 py-1 rounded-lg text-xs transition-colors ${webSearchOn ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-container text-on-surface-variant'}`}
                  title="Search web automatically"
                >
                  <span className="material-symbols-outlined text-[14px]">public</span>
                  <span className="hidden sm:inline">{webSearchOn ? 'Web Search On' : 'Search Off'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center bg-surface-container-lowest p-0.5 rounded-lg border border-outline-variant/30 text-xs">
                  <button
                    onClick={() => setMode('Autonomous')}
                    className={`px-2 py-0.5 rounded ${mode === 'Autonomous' ? 'bg-primary-container/30 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Autonomous
                  </button>
                  <button
                    onClick={() => setMode('Guided')}
                    className={`px-2 py-0.5 rounded ${mode === 'Guided' ? 'bg-primary-container/30 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'}`}
                  >
                    Guided
                  </button>
                </div>

                <button
                  onClick={handleSend}
                  className="px-4 py-1.5 bg-primary text-on-primary font-medium text-body-sm rounded-xl hover:bg-primary-container transition-all flex items-center space-x-1.5 shadow-sm active:scale-95"
                >
                  <span>Start Task</span>
                  <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      );
    };

export default ConversationPage;

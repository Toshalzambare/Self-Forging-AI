import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const ActivityLogsPage = ({ showToast }) => {
      const [filterCategory, setFilterCategory] = useState('all');
      const [openAccordion, setOpenAccordion] = useState({
        step1: true,
        step2: true,
        step3: true,
        step4: true
      });

      const toggleStep = (stepKey) => {
        setOpenAccordion(prev => ({ ...prev, [stepKey]: !prev[stepKey] }));
      };

      return (
        <main className="pt-20 min-h-screen bg-surface px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full pb-16">
          {/* Header Meta & Context */}
          <div className="flex flex-col md:flex-row md:items-end justify-between pb-6 gap-4 border-b border-outline-variant/20 mb-8">
            <div>
              <div className="flex items-center space-x-2 pb-1">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary">Autonomous Audit Trail</span>
                <span className="text-on-surface-variant/40 font-mono text-body-sm">•</span>
                <span className="font-mono text-body-sm text-on-surface-variant">Host: twinkle-core-v2.8</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg font-semibold text-on-surface tracking-tight">Activity &amp; Execution Logs</h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
                Inspect Twinkle's thought chains, internet queries, verified sandbox code, and external tool calls in plain, transparent terms.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-surface-container-low rounded-xl px-4 py-2.5 shadow-sm flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[18px]">verified</span>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">Success Rate</div>
                  <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">99.4%</div>
                </div>
              </div>
              <div className="bg-surface-container-low rounded-xl px-4 py-2.5 shadow-sm flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-secondary">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-on-surface-variant">Avg. Step Latency</div>
                  <div className="font-headline-sm text-headline-sm font-semibold text-on-surface">1.8s</div>
                </div>
              </div>
            </div>
          </div>

          {/* Grid Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Panel: Recent Missions */}
            <aside className="lg:col-span-4 flex flex-col space-y-4">
              <div className="bg-surface-container-low rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-headline-sm font-semibold text-on-surface">Mission History</span>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant">18 this week</span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
                  <input
                    className="w-full bg-surface-container text-on-surface pl-9 pr-4 py-2 rounded-xl text-body-sm font-body-sm placeholder:text-outline-variant focus:outline-none focus:bg-surface-container-high transition-colors"
                    placeholder="Search actions or tools..."
                    type="text"
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                {/* Mission 1 (Active) */}
                <div className="cursor-pointer group relative bg-surface-container-high rounded-2xl p-4 shadow-md transition-all">
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-primary rounded-r-full"></div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-label-sm text-label-sm font-medium">Completed</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">4 min ago</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-primary">arrow_forward</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-2.5 group-hover:text-primary transition-colors">
                    Market Digest &amp; Notion Sync
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                    Synthesized macroeconomic inflation markers, filtered 3 data queries, and created Notion digest block.
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-2 text-on-surface-variant font-mono text-body-sm">
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[14px] text-primary">timer</span>
                      <span>42s</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[14px]">code</span>
                      <span>1 Dynamic Script</span>
                    </span>
                  </div>
                </div>

                {/* Mission 2 */}
                <div
                  onClick={() => showToast('Loaded Run Log', 'Switched context to GitHub Issue Triage.')}
                  className="cursor-pointer group bg-surface-container-low hover:bg-surface-container rounded-2xl p-4 shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full bg-secondary-container/50 text-secondary font-label-sm text-label-sm font-medium">Completed</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">2 hrs ago</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-on-surface transition-colors">chevron_right</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-medium text-on-surface mt-2.5 group-hover:text-primary transition-colors">
                    GitHub Issue Triage &amp; Bug Report
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                    Tagged 14 inbound issues on repo twinkle-core, isolated repro stack traces for #412.
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-2 text-on-surface-variant font-mono text-body-sm">
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      <span>1m 18s</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[14px]">token</span>
                      <span>8.4k tokens</span>
                    </span>
                  </div>
                </div>

                {/* Mission 3 */}
                <div
                  onClick={() => showToast('Loaded Run Log', 'Switched context to Competitor Pricing Scrape.')}
                  className="cursor-pointer group bg-surface-container-low hover:bg-surface-container rounded-2xl p-4 shadow-sm transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">Completed</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Yesterday</span>
                    </div>
                    <span className="material-symbols-outlined text-[18px] text-outline group-hover:text-on-surface transition-colors">chevron_right</span>
                  </div>
                  <h2 className="font-headline-sm text-headline-sm font-medium text-on-surface mt-2.5 group-hover:text-primary transition-colors">
                    Competitor Pricing Scrape
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                    Polled tier matrices across 4 SaaS competitors and calculated average seat expansion deltas.
                  </p>
                  <div className="flex items-center gap-2 mt-3 pt-2 text-on-surface-variant font-mono text-body-sm">
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[14px]">timer</span>
                      <span>3m 04s</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[14px]">terminal</span>
                      <span>Puppeteer tool</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Heartbeat Status */}
              <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-on-surface-variant">Sandbox Memory Status</span>
                  <span className="font-mono text-primary">242MB / 1024MB</span>
                </div>
                <div className="w-full bg-surface-container h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full" style={{ width: '24%' }}></div>
                </div>
                <div className="flex items-center justify-between text-body-sm text-on-surface-variant">
                  <span className="flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>MCP Protocol v1.4</span>
                  </span>
                  <span className="font-mono text-on-surface">Secure Enclave</span>
                </div>
              </div>
            </aside>

            {/* Right Panel: Detailed Run Inspector */}
            <section className="lg:col-span-8 flex flex-col space-y-6">
              {/* Banner */}
              <div className="bg-surface-container-low rounded-2xl p-6 shadow-md relative overflow-hidden">
                <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 relative z-10">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm font-medium">
                        Run ID #twk-8921-sync
                      </span>
                      <span className="font-mono text-body-sm text-on-surface-variant">Model: Claude 3.7 Sonnet</span>
                    </div>
                    <h2 className="font-headline-lg text-headline-lg font-semibold text-on-surface mt-2 tracking-tight">
                      Market Digest &amp; Notion Sync
                    </h2>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1 max-w-xl">
                      Initiated via automated morning schedule. Synthesized macro market trends, queried financial feeds, auto-compiled Notion document.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-start">
                    <button
                      onClick={() => showToast('Exported Log', 'Run log downloaded as JSON')}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px] text-outline">download</span>
                      <span>Export Log</span>
                    </button>
                    <button
                      onClick={() => showToast('Task Dispatched', 'Re-executing workflow in sandbox...')}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-semibold hover:bg-primary-container transition-all shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">replay</span>
                      <span>Re-run Task</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 bg-surface-container/40 p-4 rounded-xl">
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">Total Duration</div>
                    <div className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5 flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">schedule</span>
                      <span>42.1s</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">Step Sequence</div>
                    <div className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5 flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">checklist</span>
                      <span>4 steps</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">Code Synthesized</div>
                    <div className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5 flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[16px] text-primary">integration_instructions</span>
                      <span>1 Tool Script</span>
                    </div>
                  </div>
                  <div>
                    <div className="font-label-sm text-label-sm text-on-surface-variant">Anomalies / Errors</div>
                    <div className="font-headline-sm text-headline-sm font-semibold text-emerald-400 mt-0.5 flex items-center space-x-1">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      <span>0 Errors</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter Tab Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {[
                  { id: 'all', label: 'All Events (4)' },
                  { id: 'reasoning', label: 'Reasoning & Thoughts (1)' },
                  { id: 'search', label: 'Web Searches (3)' },
                  { id: 'code', label: 'Synthesized Code (1)' },
                  { id: 'tool', label: 'Tool Calls (2)' }
                ].map(pill => (
                  <button
                    key={pill.id}
                    onClick={() => setFilterCategory(pill.id)}
                    className={`px-3.5 py-1.5 rounded-full font-body-sm text-body-sm transition-all whitespace-nowrap ${
                      filterCategory === pill.id
                        ? 'bg-primary text-on-primary font-semibold shadow-sm'
                        : 'bg-surface-container-low hover:bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>

              {/* TIMELINE CONTAINER */}
              <div className="space-y-4">
                {/* STEP 1: Cognitive Planning */}
                {(filterCategory === 'all' || filterCategory === 'reasoning') && (
                  <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm transition-all hover:bg-surface-container/60">
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleStep('step1')}>
                      <div className="flex items-start space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center mt-0.5">
                          <span className="material-symbols-outlined text-[19px]">psychology</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">Step 01</span>
                            <span className="text-on-surface-variant/40">•</span>
                            <span className="font-mono text-body-sm text-on-surface-variant">Cognitive Planning</span>
                          </div>
                          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5">
                            Goal Clarification &amp; Plan Decomposition
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-body-sm text-on-surface-variant">1.4s</span>
                        <span className={`material-symbols-outlined text-[20px] text-outline transition-transform duration-200 ${openAccordion.step1 ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {openAccordion.step1 && (
                      <div className="mt-4 pt-4 bg-surface-container/50 rounded-xl p-4 space-y-3">
                        <div className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                          <span className="text-on-surface font-semibold">Twinkle's Internal Reflection: </span>
                          "The scheduled directive is to generate Elena's 08:00 AM macro briefing. I need fresh equity index futures, current Treasury yield curves, and overnight corporate earnings sentiment. Since Notion's REST block connector accepts markdown bodies, I will query live financial indices first, extract the top 3 headlines, and write a temporary sync script to commit to the Executive Notebook page."
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                          <div className="px-2.5 py-1 rounded-lg bg-surface-container-high text-primary font-body-sm text-body-sm flex items-center space-x-1.5">
                            <span className="material-symbols-outlined text-[14px]">flag</span>
                            <span>Target: Notion Database "Morning Macro Memo"</span>
                          </div>
                          <div className="px-2.5 py-1 rounded-lg bg-surface-container-high text-secondary font-body-sm text-body-sm flex items-center space-x-1.5">
                            <span className="material-symbols-outlined text-[14px]">security</span>
                            <span>Policy Check: Read &amp; Push Authorization Active</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: Live Web Research */}
                {(filterCategory === 'all' || filterCategory === 'search') && (
                  <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm transition-all hover:bg-surface-container/60">
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleStep('step2')}>
                      <div className="flex items-start space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-secondary-container/40 text-secondary flex items-center justify-center mt-0.5">
                          <span className="material-symbols-outlined text-[19px]">travel_explore</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">Step 02</span>
                            <span className="text-on-surface-variant/40">•</span>
                            <span className="font-mono text-body-sm text-on-surface-variant">Parallel Web Extraction</span>
                          </div>
                          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5">
                            Live Web Research &amp; Market Polling
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-body-sm text-on-surface-variant">3 queries in 6.8s</span>
                        <span className={`material-symbols-outlined text-[20px] text-outline transition-transform duration-200 ${openAccordion.step2 ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {openAccordion.step2 && (
                      <div className="mt-4 pt-4 space-y-3">
                        <p className="font-body-sm text-body-sm text-on-surface-variant">
                          Twinkle spawned 3 parallel headless search threads via Brave Search MCP API and summarized source payloads:
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                          <div className="bg-surface-container rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-label-sm text-label-sm text-primary font-mono">Query #1</span>
                                <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>
                              </div>
                              <div className="font-body-md text-body-md font-semibold text-on-surface mt-1">
                                "US CPI inflation cooling market response"
                              </div>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 line-clamp-3">
                                Headline: Core index slowed to 0.2% monthly rate; futures jumped +210pts in pre-bell action.
                              </p>
                            </div>
                            <div className="mt-3 pt-2 flex items-center justify-between font-mono text-body-sm text-on-surface-variant">
                              <span>Bloomberg / Reuters</span>
                              <span className="text-primary hover:underline cursor-pointer" onClick={() => showToast('Source Preview', 'Reuters: Equity futures advance on CPI print')}>Preview →</span>
                            </div>
                          </div>

                          <div className="bg-surface-container rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-label-sm text-label-sm text-primary font-mono">Query #2</span>
                                <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>
                              </div>
                              <div className="font-body-md text-body-md font-semibold text-on-surface mt-1">
                                "10Y treasury yield 4.28%"
                              </div>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 line-clamp-3">
                                Yield stabilized near 4.276% amid institutional debt auctions; dollar index DXY retracing slightly.
                              </p>
                            </div>
                            <div className="mt-3 pt-2 flex items-center justify-between font-mono text-body-sm text-on-surface-variant">
                              <span>CNBC Markets</span>
                              <span className="text-primary hover:underline cursor-pointer" onClick={() => showToast('Source Preview', 'CNBC: Bond market yield equilibrium points')}>Preview →</span>
                            </div>
                          </div>

                          <div className="bg-surface-container rounded-xl p-3.5 shadow-sm flex flex-col justify-between">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="font-label-sm text-label-sm text-primary font-mono">Query #3</span>
                                <span className="material-symbols-outlined text-[14px] text-emerald-400">check</span>
                              </div>
                              <div className="font-body-md text-body-md font-semibold text-on-surface mt-1">
                                "Tech mega-cap Q1 earnings guidance"
                              </div>
                              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 line-clamp-3">
                                Semiconductor capex revisions positive; AI infrastructure spending projected up 18% YoY.
                              </p>
                            </div>
                            <div className="mt-3 pt-2 flex items-center justify-between font-mono text-body-sm text-on-surface-variant">
                              <span>WSJ Technology</span>
                              <span className="text-primary hover:underline cursor-pointer" onClick={() => showToast('Source Preview', 'WSJ: Big tech cloud capex beats forecast')}>Preview →</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 3: Sandbox Tool Synthesis */}
                {(filterCategory === 'all' || filterCategory === 'code' || filterCategory === 'tool') && (
                  <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm transition-all hover:bg-surface-container/60">
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleStep('step3')}>
                      <div className="flex items-start space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center mt-0.5">
                          <span className="material-symbols-outlined text-[19px]">terminal</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">Step 03</span>
                            <span className="text-on-surface-variant/40">•</span>
                            <span className="font-mono text-body-sm text-on-surface-variant">Sandbox Tool Synthesis</span>
                          </div>
                          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5">
                            Dynamic Code Generation: <code className="font-mono text-primary text-body-md">NotionDigestSync.py</code>
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono text-body-sm flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                          <span>Test Sandbox Passed in 240ms</span>
                        </span>
                        <span className={`material-symbols-outlined text-[20px] text-outline transition-transform duration-200 ${openAccordion.step3 ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {openAccordion.step3 && (
                      <div className="mt-4 pt-4 space-y-3">
                        <div className="flex items-center justify-between text-body-sm font-mono text-on-surface-variant px-1">
                          <span>Environment: Python 3.11 MicroVM Isolation</span>
                          <button
                            onClick={() => showToast('Copied Code', 'Python tool definition saved to clipboard.')}
                            className="flex items-center space-x-1 text-primary hover:underline"
                          >
                            <span className="material-symbols-outlined text-[14px]">content_copy</span>
                            <span>Copy Code</span>
                          </button>
                        </div>
                        <div className="bg-surface-container-lowest rounded-xl p-4 overflow-x-auto font-mono text-body-sm shadow-inner text-on-surface">
                          <div className="flex space-x-4 text-xs">
                            <div className="text-outline-variant select-none text-right pr-2">
                              01<br/>02<br/>03<br/>04<br/>05<br/>06<br/>07<br/>08<br/>09<br/>10<br/>11
                            </div>
                            <div className="text-on-surface leading-5">
                              <span className="text-primary font-semibold">import</span> os, json, requests<br/>
                              <span className="text-primary font-semibold">from</span> datetime <span className="text-primary font-semibold">import</span> datetime<br/>
                              <br/>
                              <span className="text-secondary font-semibold">def</span> <span className="text-primary">format_morning_blocks</span>(headlines: list) -&gt; dict:<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;"""Transforms extracted raw queries into Notion rich-text payload"""<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;timestamp = datetime.utcnow().strftime(<span className="text-primary-fixed-dim">"%Y-%m-%d %H:%M UTC"</span>)<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;blocks = [&#123;<span className="text-primary-fixed-dim">"object"</span>: <span className="text-primary-fixed-dim">"block"</span>, <span className="text-primary-fixed-dim">"type"</span>: <span className="text-primary-fixed-dim">"heading_2"</span>, <span className="text-primary-fixed-dim">"heading_2"</span>: &#123;<span className="text-primary-fixed-dim">"rich_text"</span>: [&#123;<span className="text-primary-fixed-dim">"text"</span>: &#123;<span className="text-primary-fixed-dim">"content"</span>: f<span className="text-primary-fixed-dim">"Market Open • &#123;timestamp&#125;"</span>&#125;&#125;]&#125;&#125;]<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-secondary font-semibold">for</span> item <span className="text-secondary font-semibold">in</span> headlines:<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;blocks.append(&#123;<span className="text-primary-fixed-dim">"object"</span>: <span className="text-primary-fixed-dim">"block"</span>, <span className="text-primary-fixed-dim">"type"</span>: <span className="text-primary-fixed-dim">"bulleted_list_item"</span>, <span className="text-primary-fixed-dim">"bulleted_list_item"</span>: &#123;<span className="text-primary-fixed-dim">"rich_text"</span>: [&#123;<span className="text-primary-fixed-dim">"text"</span>: &#123;<span className="text-primary-fixed-dim">"content"</span>: item&#125;&#125;]&#125;&#125;)<br/>
                              &nbsp;&nbsp;&nbsp;&nbsp;<span className="text-secondary font-semibold">return</span> &#123;<span className="text-primary-fixed-dim">"children"</span>: blocks&#125;
                            </div>
                          </div>
                        </div>
                        <div className="bg-surface-container rounded-xl p-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-body-sm">
                            <span className="material-symbols-outlined text-[18px] text-emerald-400">task_alt</span>
                            <span className="text-on-surface">Unit Verification: <span className="text-on-surface-variant font-mono">Payload Schema Conforms to Notion v2022-06-28</span></span>
                          </div>
                          <span className="font-mono text-body-sm text-primary">Exit code: 0 (OK)</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: Database Push */}
                {(filterCategory === 'all' || filterCategory === 'tool') && (
                  <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm transition-all hover:bg-surface-container/60">
                    <div className="flex items-start justify-between cursor-pointer" onClick={() => toggleStep('step4')}>
                      <div className="flex items-start space-x-3.5">
                        <div className="w-9 h-9 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center mt-0.5">
                          <span className="material-symbols-outlined text-[19px]">cloud_upload</span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-semibold">Step 04</span>
                            <span className="text-on-surface-variant/40">•</span>
                            <span className="font-mono text-body-sm text-on-surface-variant">External Dispatch</span>
                          </div>
                          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface mt-0.5">
                            Final Database Push &amp; Block Commitment
                          </h3>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-body-sm text-on-surface-variant">820ms</span>
                        <span className={`material-symbols-outlined text-[20px] text-outline transition-transform duration-200 ${openAccordion.step4 ? 'rotate-180' : ''}`}>
                          expand_more
                        </span>
                      </div>
                    </div>

                    {openAccordion.step4 && (
                      <div className="mt-4 pt-4 space-y-3">
                        <div className="bg-surface-container rounded-xl p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                              <span className="font-body-md text-body-md font-semibold text-on-surface">Notion API: 200 Created</span>
                            </div>
                            <span className="font-mono text-body-sm text-on-surface-variant">Block ID: 8bf2e...441a</span>
                          </div>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">
                            Created new subpage in workspace <span className="text-on-surface font-medium">"Elena's Strategic Command"</span> &gt; <span className="text-on-surface font-medium">"Daily Briefings 2025"</span>. Dispatched Webhook confirmation to Twinkle Mobile push notification channel.
                          </p>
                          <div className="flex items-center gap-3 pt-2">
                            <button
                              onClick={() => showToast('Notion Direct', 'Opening Notion workspace view...')}
                              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-primary font-body-sm text-body-sm transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                              <span>View in Notion</span>
                            </button>
                            <span className="font-mono text-body-sm text-on-surface-variant">Synced at 08:00:42 AM EST</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Execution Velocity Sparkline */}
              <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Step Latency Waterfall</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Relative execution time distribution for mission #twk-8921</p>
                  </div>
                  <span className="font-mono text-body-sm text-primary">Cumulative: 42.1s</span>
                </div>
                <div className="pt-2">
                  <svg className="w-full h-24 overflow-visible" fill="none" viewBox="0 0 700 90" xmlns="http://www.w3.org/2000/svg">
                    <line className="text-outline-variant/20" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="700" y1="20" y2="20"></line>
                    <line className="text-outline-variant/20" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="700" y1="50" y2="50"></line>
                    <line className="text-outline-variant/20" stroke="currentColor" strokeDasharray="4 4" x1="0" x2="700" y1="80" y2="80"></line>
                    <rect fill="#c4d9e3" height="18" opacity="0.85" rx="6" width="60" x="10" y="8"></rect>
                    <text className="font-mono text-[11px]" fill="#b8c8db" x="80" y="21">Step 1 (1.4s)</text>
                    <rect fill="#f1d0af" height="18" opacity="0.9" rx="6" width="240" x="75" y="32"></rect>
                    <text className="font-mono text-[11px]" fill="#f1d0af" x="325" y="45">Step 2 Search (6.8s)</text>
                    <rect fill="#b8c8db" height="18" opacity="0.8" rx="6" width="35" x="320" y="56"></rect>
                    <text className="font-mono text-[11px]" fill="#b8c8db" x="365" y="69">Step 3 Code Gen &amp; Test (0.24s)</text>
                    <rect fill="#d4b595" height="18" rx="6" width="75" x="360" y="56"></rect>
                    <text className="font-mono text-[11px]" fill="#d4b595" x="445" y="69">Step 4 API Commit (0.82s)</text>
                  </svg>
                </div>
              </div>
            </section>
          </div>
        </main>
      );
    };

export default ActivityLogsPage;

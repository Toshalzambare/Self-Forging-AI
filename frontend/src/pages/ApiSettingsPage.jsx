import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { APP_NAME } from '../config.js';

const ApiSettingsPage = ({ showToast, user }) => {
      const [activeTab, setActiveTab] = useState('providers');
      const [showAnthropicKey, setShowAnthropicKey] = useState(false);
      const [showOpenAIKey, setShowOpenAIKey] = useState(false);
      const [transportProtocol, setTransportProtocol] = useState('sse');
      const [autonomyLevel, setAutonomyLevel] = useState('autonomous');
      const [testingProvider, setTestingProvider] = useState(null);

      const handleTestKey = (provider) => {
        setTestingProvider(provider);
        setTimeout(() => {
          setTestingProvider(null);
          showToast(`${provider} Verified`, 'Authentication completed with 120ms roundtrip.');
        }, 800);
      };

      return (
        <main className="pt-20 min-h-screen bg-surface px-6 max-w-7xl mx-auto w-full pb-16">
          {/* Header Meta & Quick Status Strip */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-8 border-b border-outline-variant/20 mb-8">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-1 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">Orchestration &amp; Security</span>
                <span className="font-mono text-body-sm text-tertiary-fixed-dim">sys.config.v2.8</span>
              </div>
              <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight mt-1">Agent Settings &amp; Ecosystem Mesh</h1>
              <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
                Manage upstream neural foundation providers, local MCP server endpoints, execution sandbox constraints, and autonomous safety boundaries.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-surface-container-low shadow-sm">
                <div className="relative flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                  <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-60"></span>
                </div>
                <div>
                  <div className="font-label-sm text-[11px] text-on-surface-variant leading-none">MCP Daemon</div>
                  <div className="font-body-sm text-body-sm font-semibold text-on-surface">Online • 18ms</div>
                </div>
              </div>
              <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-surface-container-low shadow-sm">
                <span className="material-symbols-outlined text-[20px] text-primary">verified_user</span>
                <div>
                  <div className="font-label-sm text-[11px] text-on-surface-variant leading-none">Sandbox Mode</div>
                  <div className="font-body-sm text-body-sm font-semibold text-primary">Isolated gVisor</div>
                </div>
              </div>
              <button
                onClick={() => showToast('Settings Preserved', 'All credentials, server tokens, and safety limits saved locally.')}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-medium hover:bg-primary-container transition-all shadow-md"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Save Changes</span>
              </button>
            </div>
          </div>

          {/* Settings Hub Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sub-Navigation Rail */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-surface-container-low/80 backdrop-blur-md rounded-2xl p-3 shadow-md">
                <div className="px-3 pt-2 pb-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                  Preferences &amp; Core
                </div>
                <nav className="space-y-1">
                  {[
                    { id: 'providers', label: 'Model Providers', icon: 'smart_toy', badge: '3 Live' },
                    { id: 'endpoints', label: 'Custom Endpoints & MCP', icon: 'hub', dot: true },
                    { id: 'autonomy', label: 'Autonomy & Guardrails', icon: 'shield_person', badge: 'Active' },
                    { id: 'profile', label: 'User Profile & Quotas', icon: 'account_circle', chevron: true }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-body-md text-body-md font-medium text-left transition-all ${
                        activeTab === tab.id
                          ? 'bg-surface-container-high text-primary shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </div>
                      {tab.badge && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">{tab.badge}</span>
                      )}
                      {tab.dot && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                      {tab.chevron && <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Ecosystem Health Card */}
              <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-body-md font-medium text-on-surface">Agent Throughput</span>
                  <span className="font-mono text-xs text-primary font-medium">99.98%</span>
                </div>
                <div className="w-full h-12 flex items-center">
                  <svg className="w-full h-10 overflow-visible" viewBox="0 0 200 40">
                    <path className="text-primary" d="M 0,32 Q 25,28 50,30 T 100,16 T 150,18 T 200,6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5"></path>
                    <path className="text-primary/10" d="M 0,32 Q 25,28 50,30 T 100,16 T 150,18 T 200,6 L 200,40 L 0,40 Z" fill="currentColor"></path>
                    <circle className="fill-primary" cx="200" cy="6" r="3.5"></circle>
                  </svg>
                </div>
                <div className="pt-2 flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                  <span>24h Invocations: 1,482</span>
                  <span>Est. Cost: $4.18</span>
                </div>
              </div>

              {/* Socket Quick Card */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest text-on-surface-variant space-y-2">
                <div className="flex items-center space-x-2 text-primary">
                  <span className="material-symbols-outlined text-[18px]">terminal</span>
                  <span className="font-mono text-xs font-semibold">Active Session Socket</span>
                </div>
                <p className="font-mono text-[11px] text-tertiary-fixed-dim leading-relaxed break-all">
                  wss://{APP_NAME}.local/rpc/v1#ea-908
                </p>
                <div className="text-[11px] text-on-surface-variant flex items-center justify-between pt-1">
                  <span>Heartbeat: 4s</span>
                  <span className="text-emerald-400 font-mono">ENCRYPTED</span>
                </div>
              </div>
            </div>

            {/* Main Panels Content Area */}
            <div className="lg:col-span-9 space-y-8">
              {/* SECTION 1: MODEL PROVIDERS */}
              {activeTab === 'providers' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">AI Model Providers &amp; Credentials</h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Securely store encrypted authorization tokens locally. {APP_NAME} routes tasks to optimal LLMs dynamically.</p>
                    </div>
                    <button
                      onClick={() => showToast('Model Manifest', 'Custom model descriptor wizard launched.')}
                      className="self-start sm:self-auto flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[16px] text-primary">add</span>
                      <span>Add Custom LLM</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    {/* Anthropic Card */}
                    <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[24px]">psychology</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">Anthropic Claude</h3>
                              <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-label-sm text-[11px] font-semibold">Active Default</span>
                            </div>
                            <div className="font-body-sm text-xs text-on-surface-variant">Default: Claude 3.7 Sonnet (Hybrid Reasoning &amp; Code Synthesis)</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-label-sm text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Valid Key</span>
                          </span>
                          <span className="font-mono text-xs text-on-surface-variant px-2">240k ctx</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-8 relative">
                          <input
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-mono text-xs tracking-wider focus:outline-none focus:bg-surface-container-high transition-colors"
                            type={showAnthropicKey ? 'text' : 'password'}
                            defaultValue="sk-ant-api03-9A8df9283jkLMMNzP9019283-xK991"
                          />
                          <button
                            onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {showAnthropicKey ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        <div className="md:col-span-4 flex items-center space-x-2">
                          <button
                            onClick={() => handleTestKey('Anthropic')}
                            disabled={testingProvider === 'Anthropic'}
                            className="flex-1 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-all flex items-center justify-center space-x-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px] text-tertiary">bolt</span>
                            <span>{testingProvider === 'Anthropic' ? 'Testing...' : 'Test Link'}</span>
                          </button>
                          <button
                            onClick={() => showToast('Parameters', 'Anthropic temperature=0.2, top_p=0.95')}
                            className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                          >
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* OpenAI Card */}
                    <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined text-[24px]">cognition</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">OpenAI</h3>
                              <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary font-label-sm text-[11px] font-semibold">Fallback Engine</span>
                            </div>
                            <div className="font-body-sm text-xs text-on-surface-variant">Default: GPT-4o (Vision Analysis &amp; High-Throughput Batching)</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-label-sm text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Valid Key</span>
                          </span>
                          <span className="font-mono text-xs text-on-surface-variant px-2">128k ctx</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-8 relative">
                          <input
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-mono text-xs tracking-wider focus:outline-none focus:bg-surface-container-high transition-colors"
                            type={showOpenAIKey ? 'text' : 'password'}
                            defaultValue="sk-proj-78190BNaJ3k801Z89N1Kla719028L"
                          />
                          <button
                            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[18px]">
                              {showOpenAIKey ? 'visibility_off' : 'visibility'}
                            </span>
                          </button>
                        </div>
                        <div className="md:col-span-4 flex items-center space-x-2">
                          <button
                            onClick={() => handleTestKey('OpenAI')}
                            disabled={testingProvider === 'OpenAI'}
                            className="flex-1 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-all flex items-center justify-center space-x-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px] text-tertiary">bolt</span>
                            <span>{testingProvider === 'OpenAI' ? 'Testing...' : 'Test Link'}</span>
                          </button>
                          <button
                            onClick={() => showToast('Parameters', 'OpenAI fallback priority order updated.')}
                            className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
                          >
                            <span className="material-symbols-outlined text-[18px]">tune</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Ollama Card */}
                    <div className="bg-surface-container-low rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 flex items-center justify-center text-tertiary">
                            <span className="material-symbols-outlined text-[24px]">dns</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">Ollama &amp; Local Hardware</h3>
                              <span className="px-2 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-label-sm text-[11px] font-semibold">Zero Telemetry</span>
                            </div>
                            <div className="font-body-sm text-xs text-on-surface-variant">Host: DeepSeek-R1-Distill (14B) &amp; Qwen-2.5-Coder</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-400/10 text-emerald-400 font-label-sm text-[11px] font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            <span>Daemon Active</span>
                          </span>
                          <span className="font-mono text-xs text-on-surface-variant px-2">Local GPU (16GB)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-8 relative">
                          <input
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-mono text-xs tracking-wider focus:outline-none focus:bg-surface-container-high transition-colors"
                            type="text"
                            defaultValue="http://127.0.0.1:11434/v1"
                          />
                        </div>
                        <div className="md:col-span-4 flex items-center space-x-2">
                          <button
                            onClick={() => handleTestKey('Ollama')}
                            className="flex-1 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-all flex items-center justify-center space-x-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px] text-tertiary">speed</span>
                            <span>Ping (4ms)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 2: CUSTOM ENDPOINTS & MCP */}
              {activeTab === 'endpoints' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">Custom Endpoints &amp; MCP Mesh</h2>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Model Context Protocol (MCP) server interconnects for external file, database, and tool execution.</p>
                    </div>
                    <span className="font-label-sm text-[11px] text-tertiary-fixed-dim bg-tertiary-container/10 px-2.5 py-1 rounded-full font-mono">MCP Spec: 2024-11-05</span>
                  </div>

                  <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                      <div className="md:col-span-8 space-y-2">
                        <label className="font-label-lg text-label-lg font-medium text-on-surface flex items-center justify-between">
                          <span>Primary MCP Gateway URL</span>
                          <span className="text-xs font-normal text-on-surface-variant">SSE or internal daemon socket</span>
                        </label>
                        <div className="flex items-stretch rounded-xl overflow-hidden shadow-sm bg-surface-container">
                          <div className="flex items-center px-3.5 bg-surface-container-high text-tertiary font-mono text-xs select-none">
                            sse://
                          </div>
                          <input
                            className="flex-1 bg-transparent px-3.5 py-2.5 text-on-surface font-mono text-xs focus:outline-none"
                            type="text"
                            defaultValue="localhost:8000/sse"
                          />
                        </div>
                      </div>

                      <div className="md:col-span-4 space-y-2">
                        <label className="font-label-lg text-label-lg font-medium text-on-surface">Transport Protocol</label>
                        <div className="grid grid-cols-2 gap-1.5 p-1 bg-surface-container rounded-xl">
                          <button
                            onClick={() => {
                              setTransportProtocol('sse');
                              showToast('Transport Updated', 'Default MCP communication set to SSE');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-all ${
                              transportProtocol === 'sse' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            SSE
                          </button>
                          <button
                            onClick={() => {
                              setTransportProtocol('stdio');
                              showToast('Transport Updated', 'Default MCP communication set to STDIO');
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              transportProtocol === 'stdio' ? 'bg-surface-container-high text-primary' : 'text-on-surface-variant hover:text-on-surface'
                            }`}
                          >
                            Stdio / IPC
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-surface-container-lowest">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                          <span className="material-symbols-outlined text-[18px]">cell_tower</span>
                        </div>
                        <div>
                          <div className="font-body-sm text-body-sm font-semibold text-on-surface">Stream Sockets Handshake Active</div>
                          <div className="font-label-sm text-[11px] text-on-surface-variant">24 tools and 3 resources exported from host machine</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-400 font-mono text-xs font-semibold">18ms Latency</span>
                        <button
                          onClick={() => showToast('MCP Ping', 'Daemon active at http://localhost:8000/sse')}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-sm text-xs transition-colors flex items-center space-x-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">refresh</span>
                          <span>Ping MCP</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">Registered Micro-Servers</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="p-3.5 rounded-xl bg-surface-container flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="material-symbols-outlined text-primary text-[18px]">folder_special</span>
                            <div>
                              <div className="font-body-sm text-body-sm font-medium text-on-surface">Filesystem MCP</div>
                              <div className="text-[10px] text-tertiary font-mono">/Users/{user?.username?.toLowerCase() || 'user'}/Projects</div>
                            </div>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-surface-container flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="material-symbols-outlined text-primary text-[18px]">database</span>
                            <div>
                              <div className="font-body-sm text-body-sm font-medium text-on-surface">Postgres Bridge</div>
                              <div className="text-[10px] text-tertiary font-mono">127.0.0.1:5432</div>
                            </div>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-surface-container flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="material-symbols-outlined text-outline text-[18px]">travel_explore</span>
                            <div>
                              <div className="font-body-sm text-body-sm font-medium text-on-surface">Brave Search API</div>
                              <div className="text-[10px] text-outline font-mono">api.search.brave.com</div>
                            </div>
                          </div>
                          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 3: AUTONOMY & GUARDRAILS */}
              {activeTab === 'autonomy' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">Autonomy &amp; Human Guardrails</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Define how freely {APP_NAME} can synthesize new scripts, run bash terminal instructions, and expend task tokens.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <label
                      onClick={() => setAutonomyLevel('autonomous')}
                      className={`group relative flex flex-col justify-between p-5 rounded-2xl cursor-pointer transition-all shadow-sm ${
                        autonomyLevel === 'autonomous' ? 'bg-surface-container border border-primary/40' : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined text-[24px]">auto_mode</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          autonomyLevel === 'autonomous' ? 'bg-primary text-on-primary' : 'bg-surface-container-high'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-body-lg text-body-lg font-semibold text-on-surface">Autonomous Execution</h4>
                          <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-label-sm text-[10px] font-semibold">Recommended</span>
                        </div>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                          {APP_NAME} writes, tests, and runs newly synthesized Python tools in the local sandbox without prompting for confirmation on each sub-step.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-tertiary-fixed-dim border-t border-outline-variant/10">
                        <span>Fastest workflow throughput</span>
                        <span className="font-mono">Level: Tier 3</span>
                      </div>
                    </label>

                    <label
                      onClick={() => setAutonomyLevel('guided')}
                      className={`group relative flex flex-col justify-between p-5 rounded-2xl cursor-pointer transition-all shadow-sm ${
                        autonomyLevel === 'guided' ? 'bg-surface-container border border-primary/40' : 'bg-surface-container-low hover:bg-surface-container'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-10 h-10 rounded-xl bg-secondary-container/20 flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-[24px]">front_hand</span>
                        </div>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                          autonomyLevel === 'guided' ? 'bg-primary text-on-primary' : 'bg-surface-container-high'
                        }`}>
                          <span className="material-symbols-outlined text-[14px]">check</span>
                        </div>
                      </div>
                      <div className="mt-4">
                        <h4 className="font-body-lg text-body-lg font-semibold text-on-surface">Guided Mode (Human-in-the-Loop)</h4>
                        <p className="font-body-sm text-xs text-on-surface-variant mt-1.5 leading-relaxed">
                          {APP_NAME} pauses and presents proposed code diffs, file writes, and network calls for your one-click approval before running them.
                        </p>
                      </div>
                      <div className="mt-4 pt-3 flex items-center justify-between text-[11px] text-tertiary-fixed-dim border-t border-outline-variant/10">
                        <span>Maximum inspection &amp; caution</span>
                        <span className="font-mono">Level: Tier 1</span>
                      </div>
                    </label>
                  </div>

                  <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-5">
                    <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">Execution Safeguards</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container">
                        <div className="flex items-center space-x-3.5 pr-4">
                          <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[20px]">sanitizer</span>
                          </div>
                          <div>
                            <div className="font-body-md text-body-md font-medium text-on-surface">Auto-verify synthesized code in sandbox</div>
                            <div className="font-body-sm text-xs text-on-surface-variant">Runs static AST validation and memory limit tests before execution</div>
                          </div>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded bg-surface-container-high border-outline text-primary focus:ring-0 w-5 h-5 cursor-pointer"/>
                      </div>

                      <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-container">
                        <div className="flex items-center space-x-3.5 pr-4">
                          <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-tertiary">
                            <span className="material-symbols-outlined text-[20px]">public</span>
                          </div>
                          <div>
                            <div className="font-body-md text-body-md font-medium text-on-surface">Autonomous Internet &amp; Web Scraper Access</div>
                            <div className="font-body-sm text-xs text-on-surface-variant">Allows fetch requests to browse documentation, APIs, and real-time feeds</div>
                          </div>
                        </div>
                        <input type="checkbox" defaultChecked className="rounded bg-surface-container-high border-outline text-primary focus:ring-0 w-5 h-5 cursor-pointer"/>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-surface-container gap-4">
                        <div className="flex items-center space-x-3.5 pr-4">
                          <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined text-[20px]">monetization_on</span>
                          </div>
                          <div>
                            <div className="font-body-md text-body-md font-medium text-on-surface">Max Spend Cap per Single Task</div>
                            <div className="font-body-sm text-xs text-on-surface-variant">{APP_NAME} aborts recursive reasoning loops if estimated token cost exceeds cap</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center bg-surface-container-high rounded-lg px-3 py-1.5 text-on-surface font-mono text-sm">
                            <span className="text-tertiary-fixed-dim mr-1">$</span>
                            <input className="w-14 bg-transparent text-on-surface font-mono text-sm focus:outline-none" min="0.10" step="0.25" type="number" defaultValue="1.50"/>
                          </div>
                          <span className="text-xs text-on-surface-variant">USD / task</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SECTION 4: USER PROFILE & BILLING */}
              {activeTab === 'profile' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">User Profile &amp; Quotas</h2>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Account identity, active subscription tier, and connected computing cluster credentials.</p>
                  </div>

                  <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-outline-variant/20">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          <img
                            className="w-16 h-16 rounded-2xl object-cover shadow-md"
                            alt="{user?.username || 'User'}"
                            src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6xqg8kdzgY1Ssq3XtQV1J4h7Yinun0DGEN-bos_6UXZr8NFxJ4J1bezVlom2MjDG1zjxNIePUDoB77mgth1hwQ22M5bTmEi6k9EG46TWRJKh35m6RGVmERNydYG9pZNMzpdz9WNg4-YwCXGM6YoBiEacd5gQTHxeqjVSV6dOKG0gLCbaAcSDBHCdXam_6FRIKiiKwuz1r57cVAowFW2Skd0lOouFT50Uq0djAvUBmnxhk1DLsm-82-A"
                          />
                          <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-surface-container-low"></span>
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{user?.username || 'User'}</h3>
                            <span className="px-2.5 py-0.5 rounded-full bg-primary/20 text-primary font-label-sm text-[11px] font-semibold">Pro Partner</span>
                          </div>
                          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">{user?.username?.toLowerCase() || 'user'}.vance@{APP_NAME}-research.io • Seat ID #EA-771</p>
                          <div className="flex items-center space-x-3 mt-1.5 text-xs text-tertiary font-mono">
                            <span>Cluster: US-West-2</span>
                            <span>•</span>
                            <span>Role: Agent Architect</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => showToast('Profile', 'Profile edit drawer ready.')}
                          className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm transition-colors"
                        >
                          Edit Profile
                        </button>
                        <button
                          onClick={() => showToast('Subscription', 'Plan tier: Enterprise Unlimited.')}
                          className="px-4 py-2 rounded-xl bg-primary-container/25 text-primary hover:bg-primary-container/40 font-body-sm text-body-sm font-medium transition-colors"
                        >
                          Manage Tier
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                      <div className="p-4 rounded-xl bg-surface-container space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-on-surface font-medium">Tool Synthesis Tokens</span>
                          <span className="text-primary font-mono font-medium">68%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: '68%' }}></div>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex justify-between">
                          <span>340k used</span>
                          <span className="text-tertiary-fixed-dim">500k limit</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-on-surface font-medium">MCP Daemon RPC Calls</span>
                          <span className="text-secondary font-mono font-medium">24%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                          <div className="h-full rounded-full bg-secondary" style={{ width: '24%' }}></div>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex justify-between">
                          <span>12,410 calls</span>
                          <span className="text-tertiary-fixed-dim">50,000 limit</span>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-surface-container space-y-3">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-on-surface font-medium">Sandbox Cache Storage</span>
                          <span className="text-tertiary font-mono font-medium">12%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
                          <div className="h-full rounded-full bg-tertiary" style={{ width: '12%' }}></div>
                        </div>
                        <div className="text-[11px] text-on-surface-variant flex justify-between">
                          <span>1.2 GB stored</span>
                          <span className="text-tertiary-fixed-dim">10.0 GB cap</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      );
    };

export default ApiSettingsPage;

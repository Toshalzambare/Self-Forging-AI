import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const EcosystemToolsPage = ({ onInspectCode, showToast }) => {
      const [filterCategory, setFilterCategory] = useState('all');
      const [searchQuery, setSearchQuery] = useState('');
      const [testingTool, setTestingTool] = useState(null);

      const allTools = [
        {
          id: 'notion',
          name: 'NotionDigestSync',
          category: 'synthesized productivity',
          isSynthesized: true,
          synthBadge: 'Synthesized by Agent 15m ago',
          desc: 'Parses financial market news and pushes structured card databases with stock tickers, sentiment metrics, and executive summaries directly into user workspace.',
          metricLabel: 'Used in 1 task',
          metricVal: '0 errors',
          metricIcon: 'query_stats',
          codeId: 'NotionDigestSync'
        },
        {
          id: 'crawler',
          name: 'Web Search & Crawler',
          category: 'mcp research',
          isSynthesized: false,
          badge: 'MCP Official',
          desc: 'Ultra-low latency web discovery with headless JavaScript evaluation, Markdown cleaning, and selective content extraction.',
          metricLabel: '182 calls today',
          metricVal: '142ms avg',
          metricIcon: 'speed'
        },
        {
          id: 'github',
          name: 'GitHub PR Automator',
          category: 'mcp productivity',
          isSynthesized: false,
          badge: 'Active Hook',
          badgeEmerald: true,
          desc: 'Monitors repo pull requests, drafts unit tests, signs verified commits with GPG, and submits inline code review responses.',
          metricLabel: '12 merged PRs',
          metricVal: 'Verified GPG',
          metricIcon: 'commit'
        },
        {
          id: 'sandbox',
          name: 'Python Sandbox Runner',
          category: 'mcp data',
          isSynthesized: false,
          badge: 'Isolated gVisor',
          desc: 'Zero-network execution environment for dataframes, statistical modeling, algorithmic transforms, and matplotlib rendering.',
          metricLabel: 'Python 3.12.2',
          metricVal: '1GB / 2vCPU',
          metricIcon: 'memory'
        },
        {
          id: 'slack',
          name: 'Slack Dispatcher',
          category: 'mcp productivity',
          isSynthesized: false,
          badge: '#daily-briefings',
          desc: 'Formatted morning rollups and immediate task alerts dispatched directly to your team or private workspace direct messages.',
          metricLabel: '4 channels bound',
          metricVal: 'OAuth OK',
          metricIcon: 'send'
        },
        {
          id: 'sql',
          name: 'SQL Query Synthesizer',
          category: 'synthesized data',
          isSynthesized: true,
          synthBadge: 'Synthesized Yesterday',
          desc: 'Auto-discovers Supabase and PostgreSQL database constraints to formulate read-only analytical aggregations without manual schema declaration.',
          metricLabel: '4 queries run',
          metricVal: '100% Read Safe',
          metricIcon: 'data_object',
          codeId: 'SQLSynthesizer'
        }
      ];

      const handleTest = (toolId) => {
        setTestingTool(toolId);
        setTimeout(() => {
          setTestingTool(null);
          showToast('Health Check Passed', `Tool ${toolId} responded with 200 OK via local socket.`);
        }, 800);
      };

      const filteredTools = allTools.filter(t => {
        const matchesCategory = filterCategory === 'all' || t.category.includes(filterCategory);
        const matchesQuery = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             t.desc.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesQuery;
      });

      return (
        <main className="pt-20 min-h-screen bg-surface px-6 md:px-12 py-6 max-w-7xl mx-auto w-full">
          <div className="space-y-10">
            {/* Ambient Headline Banner */}
            <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-8 shadow-xl">
              <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-gradient-to-br from-primary/10 via-primary-container/5 to-transparent blur-3xl pointer-events-none"></div>
              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="max-w-2xl space-y-3">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-surface-container text-primary font-label-sm text-label-sm shadow-sm">
                    <span className="material-symbols-outlined text-[16px] text-primary material-symbols-fill">auto_fix_high</span>
                    <span>Autonomous Tool Synthesis &amp; MCP Matrix</span>
                  </div>
                  <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                    Ecosystem &amp; Tools
                  </h1>
                  <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                    Twinkle operates with verified Model Context Protocol connectors and independently writes, sandboxes, and verifies custom micro-tools whenever novel capabilities are required.
                  </p>
                </div>

                {/* Friendly Stat Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-surface-container backdrop-blur-md shadow-md flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Connected Tools</span>
                      <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
                    </div>
                    <div className="mt-3 flex items-baseline space-x-2">
                      <span className="font-headline-lg text-headline-lg font-semibold text-on-surface">24</span>
                      <span className="font-body-sm text-body-sm text-primary">Active</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container backdrop-blur-md shadow-md flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Dynamic Tools</span>
                      <span className="material-symbols-outlined text-primary text-[20px] material-symbols-fill">bolt</span>
                    </div>
                    <div className="mt-3 flex items-baseline space-x-2">
                      <span className="font-headline-lg text-headline-lg font-semibold text-primary">3</span>
                      <span className="font-body-sm text-body-sm text-on-surface-variant">Self-Created</span>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container backdrop-blur-md shadow-md flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Task Success</span>
                      <span className="material-symbols-outlined text-primary text-[20px]">verified</span>
                    </div>
                    <div className="mt-3 flex items-baseline space-x-2">
                      <span className="font-headline-lg text-headline-lg font-semibold text-on-surface">99.4%</span>
                      <span className="font-body-sm text-body-sm text-primary">Reliability</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Educational Banner: How Twinkle Creates Tools */}
            <div className="relative overflow-hidden rounded-xl bg-surface-container shadow-lg p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-label-sm text-label-sm text-primary font-semibold tracking-wider uppercase">Adaptive Capabilities</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                    <span className="font-label-sm text-label-sm text-on-surface-variant">Autonomous Loop</span>
                  </div>
                  <h2 className="font-headline-md text-headline-md text-on-surface font-semibold mt-1">
                    How Twinkle creates tools on the fly
                  </h2>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-1 max-w-xl">
                    Never get blocked by missing integrations. When you ask for complex workflows, Twinkle drafts secure Python tools in real time.
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => onInspectCode('NotionDigestSync')}
                    className="px-4 py-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-body-sm text-body-sm transition-all shadow-sm flex items-center space-x-2"
                  >
                    <span className="material-symbols-outlined text-[18px] text-primary">terminal</span>
                    <span>View Synthesizer Engine Logs</span>
                  </button>
                </div>
              </div>

              {/* 3-Step Visual Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between hover:bg-surface-container-high transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-semibold">1</span>
                      <span className="material-symbols-outlined text-[22px] text-primary">search_check</span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Detect Missing Capability</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                        Agent senses an unreachable endpoint or unstructured payload requirement during conversational task planning.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 flex items-center space-x-2 text-on-tertiary-container font-label-sm text-label-sm">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span className="font-mono text-tertiary">Schema introspection</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between hover:bg-surface-container-high transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-semibold">2</span>
                      <span className="material-symbols-outlined text-[22px] text-primary material-symbols-fill">shield_spark</span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Generate &amp; Test Sandbox</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                        Writes isolated code, verifies parameter constraints, and runs synthetic test cases in an ephemeral micro-container.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 flex items-center space-x-2 text-on-tertiary-container font-label-sm text-label-sm">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span className="font-mono text-tertiary">AST safety verification</span>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-surface-container-low shadow-sm flex flex-col justify-between hover:bg-surface-container-high transition-colors">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-headline-sm text-headline-sm font-semibold">3</span>
                      <span className="material-symbols-outlined text-[22px] text-primary">published_with_changes</span>
                    </div>
                    <div>
                      <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">Register into MCP Protocol</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 leading-relaxed">
                        Publishes tool manifests with JSON schemas into active runtime session. Available instantly for autonomous calling.
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 flex items-center space-x-2 text-on-tertiary-container font-label-sm text-label-sm">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>
                    <span className="font-mono text-tertiary">Zero user intervention</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container shadow-inner transition-colors"
                    placeholder="Search all 24 tools, schemas, and descriptors..."
                    type="text"
                  />
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                  {[
                    { id: 'all', label: 'All Tools (24)' },
                    { id: 'mcp', label: 'Built-in MCP' },
                    { id: 'synthesized', label: 'Autonomous / Synthesized (3)' },
                    { id: 'productivity', label: 'Notion & Productivity' },
                    { id: 'research', label: 'Web & Research' },
                    { id: 'data', label: 'Data & APIs' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterCategory(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl font-label-lg text-label-lg font-medium shadow-sm transition-all whitespace-nowrap ${
                        filterCategory === tab.id
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tool Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
              {filteredTools.map(tool => (
                <div
                  key={tool.id}
                  className="relative rounded-xl bg-surface-container p-6 shadow-xl flex flex-col justify-between group hover:bg-surface-container-high transition-all border border-outline-variant/30"
                >
                  <div className="space-y-4">
                    <div className="flex items-start justify-between">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${tool.isSynthesized ? 'bg-primary-container/20 text-primary' : 'bg-surface-container-high text-primary'}`}>
                        <span className="material-symbols-outlined text-[28px] material-symbols-fill">
                          {tool.isSynthesized ? 'auto_awesome' : (tool.id === 'crawler' ? 'travel_explore' : (tool.id === 'github' ? 'merge' : (tool.id === 'sandbox' ? 'code_blocks' : 'forum')))}
                        </span>
                      </div>

                      {tool.isSynthesized ? (
                        <div className="flex flex-col items-end space-y-1">
                          <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary font-label-sm text-[11px] font-semibold flex items-center space-x-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                            <span>{tool.synthBadge}</span>
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-surface-container-lowest text-secondary font-label-sm text-[10px]">
                            Verified &amp; Sandboxed
                          </span>
                        </div>
                      ) : (
                        <span className={`px-2.5 py-1 rounded-full bg-surface-container-lowest font-label-sm text-[11px] font-medium flex items-center space-x-1 ${tool.badgeEmerald ? 'text-emerald-400' : 'text-secondary'}`}>
                          {tool.badgeEmerald && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                          <span>{tool.badge}</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{tool.name}</h3>
                        {tool.isSynthesized && (
                          <span className="material-symbols-outlined text-primary text-[18px] material-symbols-fill" title="Twinkle Custom Created">verified</span>
                        )}
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed">
                        {tool.desc}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-surface-container-low flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm font-mono">
                      <div className="flex items-center space-x-2">
                        <span className="material-symbols-outlined text-[16px] text-primary">{tool.metricIcon}</span>
                        <span>{tool.metricLabel}</span>
                      </div>
                      <span className="text-primary font-semibold">{tool.metricVal}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 space-y-2">
                    <div className={`grid ${tool.isSynthesized ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
                      {tool.isSynthesized && (
                        <button
                          onClick={() => onInspectCode(tool.codeId)}
                          className="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-bright text-on-surface font-body-sm text-xs font-medium text-center transition-colors shadow-sm"
                        >
                          Inspect Code
                        </button>
                      )}
                      <button
                        disabled={testingTool === tool.id}
                        onClick={() => handleTest(tool.id)}
                        className="py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-bright text-on-surface font-body-sm text-xs font-medium text-center transition-colors shadow-sm disabled:opacity-60"
                      >
                        {testingTool === tool.id ? 'Testing...' : 'Test Tool'}
                      </button>
                      <button
                        onClick={() => showToast('Configuration', `Preferences opened for ${tool.name}`)}
                        className={`py-2 px-3 rounded-xl font-body-sm text-xs font-semibold text-center transition-colors shadow-sm ${
                          tool.isSynthesized ? 'bg-primary text-on-primary hover:bg-primary-container' : 'bg-surface-container-low hover:bg-surface-bright text-on-surface'
                        }`}
                      >
                        {tool.isSynthesized ? 'Configure' : 'Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      );
    };

export default EcosystemToolsPage;

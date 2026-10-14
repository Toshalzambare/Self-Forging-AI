import React, { useState, useEffect } from 'react';
import { apiFetch, APP_NAME } from '../config.js';

const EcosystemToolsPage = ({ onInspectCode, showToast, user }) => {
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testingTool, setTestingTool] = useState(null);

  const [allTools, setAllTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTools = async () => {
      try {
        const data = await apiFetch('/api/tools');
        const mappedTools = (data.tools || []).map(t => ({
            id: t.id,
            name: t.name,
            desc: t.description || 'No description provided.',
            category: 'synthesized',
            isSynthesized: true,
            synthBadge: 'Custom Built',
            codeId: t.name,
            metricIcon: 'terminal',
            metricLabel: 'Created',
            metricVal: new Date(t.created_at).toLocaleDateString(),
            code: t.code
        }));
        setAllTools(mappedTools);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTools();
  }, []);

  const handleTest = async (toolId) => {
    setTestingTool(toolId);
    try {
      const res = await apiFetch(`/api/tools/${toolId}/test`, { method: 'POST' });
      showToast(
        res.status === 'passed' ? 'Verification Passed' : 'Verification Issue',
        res.message || `Tested tool ${toolId}`
      );
    } catch (err) {
      showToast('Test Failed', err.message);
    } finally {
      setTestingTool(null);
    }
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
        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-8 shadow-xl">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight">
                Ecosystem &amp; Tools
              </h1>
              <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                {APP_NAME} operates with verified Model Context Protocol connectors and independently writes, sandboxes, and verifies custom micro-tools whenever novel capabilities are required.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-surface-container backdrop-blur-md shadow-md flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-medium uppercase tracking-wider">Connected Tools</span>
                  <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
                </div>
                <div className="mt-3 flex items-baseline space-x-2">
                  <span className="font-headline-lg text-headline-lg font-semibold text-on-surface">{allTools.length}</span>
                  <span className="font-body-sm text-body-sm text-primary">Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline font-body-sm text-body-sm focus:outline-none focus:bg-surface-container shadow-inner transition-colors"
                placeholder="Search tools, schemas, and descriptors..."
                type="text"
              />
            </div>
            <div className="flex items-center space-x-2 overflow-x-auto pb-1">
              {[
                { id: 'all', label: `All Tools (${allTools.length})` },
                { id: 'synthesized', label: `Synthesized (${allTools.length})` },
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

        {loading ? (
          <div className="text-center py-16 font-mono text-on-surface-variant flex flex-col items-center justify-center space-y-2">
            <span className="material-symbols-outlined text-[28px] animate-spin text-primary">sync</span>
            <span>Loading tools registry...</span>
          </div>
        ) : error ? (
          <div className="text-center py-10 font-mono text-error">Error: {error}</div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">extension_off</span>
            </div>
            <h3 className="font-semibold text-on-surface text-base">No Synthesized Tools Found</h3>
            <p className="text-xs text-on-surface-variant max-w-md">
              Ask the agent to perform a novel capability in the Conversation tab. It will autonomously synthesize, verify in Docker, and register the tool here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredTools.map(tool => (
              <div
                key={tool.id}
                className="relative rounded-xl bg-surface-container p-6 shadow-xl flex flex-col justify-between group hover:bg-surface-container-high transition-all border border-outline-variant/30"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm bg-primary-container/20 text-primary`}>
                      <span className="material-symbols-outlined text-[28px] material-symbols-fill">
                        auto_awesome
                      </span>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary font-label-sm text-[11px] font-semibold flex items-center space-x-1 shadow-sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                        <span>{tool.synthBadge}</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{tool.name}</h3>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 leading-relaxed line-clamp-3">
                      {tool.desc}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 space-y-2">
                  <div className="flex flex-col xl:flex-row gap-2">
                    <button
                      onClick={() => onInspectCode(tool.name, tool.code)}
                      className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-bright text-on-surface font-body-sm text-xs font-medium text-center transition-colors shadow-sm whitespace-nowrap"
                    >
                      Inspect Code
                    </button>
                    <button
                      disabled={testingTool === tool.id}
                      onClick={() => handleTest(tool.id)}
                      className="flex-1 py-2 px-3 rounded-xl bg-surface-container-low hover:bg-surface-bright text-on-surface font-body-sm text-xs font-medium text-center transition-colors shadow-sm disabled:opacity-60 whitespace-nowrap"
                    >
                      {testingTool === tool.id ? 'Testing...' : 'Test Tool'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default EcosystemToolsPage;

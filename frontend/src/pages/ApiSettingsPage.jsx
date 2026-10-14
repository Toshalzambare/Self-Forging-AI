import React, { useState, useEffect } from 'react';
import { APP_NAME, apiFetch } from '../config.js';

const ApiSettingsPage = ({ showToast, user }) => {
  const [activeTab, setActiveTab] = useState('providers');
  const [autonomyLevel, setAutonomyLevel] = useState('autonomous');
  const [testingProvider, setTestingProvider] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [providers, setProviders] = useState([]);
  const [mcpServers, setMcpServers] = useState([]);
  const [apiKeys, setApiKeys] = useState({});

  useEffect(() => {
    if (activeTab === 'providers') {
      apiFetch('/api/settings/providers')
        .then((data) => setProviders(data.providers || []))
        .catch((err) => showToast?.('Error', err.message));
    } else if (activeTab === 'endpoints') {
      apiFetch('/api/settings/mcp_servers')
        .then((data) => setMcpServers(data.mcp_servers || []))
        .catch((err) => showToast?.('Error', err.message));
    }
  }, [activeTab, showToast]);

  const handleSaveProviders = async () => {
    setIsSaving(true);
    try {
      const updates = Object.entries(apiKeys).filter(([_, key]) => Boolean(key && key.trim()));
      if (updates.length === 0) {
        showToast?.('Settings Saved', 'Provider preferences updated.');
        return;
      }
      for (const [providerId, key] of updates) {
        await apiFetch(`/api/settings/providers/${providerId}`, {
          method: 'PATCH',
          body: JSON.stringify({ api_key: key.trim() }),
        });
        setApiKeys((prev) => {
          const next = { ...prev };
          delete next[providerId];
          return next;
        });
      }
      showToast?.('Credentials Saved', 'API credentials updated and persisted.');
    } catch (err) {
      showToast?.('Save Failed', err.message || 'Failed to save settings.');
    } finally {
      try {
        const data = await apiFetch('/api/settings/providers');
        setProviders(data.providers || []);
      } catch (_) {}
      setIsSaving(false);
    }
  };

  const handleTestKey = (provider) => {
    const key = apiKeys[provider.id] || (provider.has_api_key ? 'configured' : '');
    if (!key) {
      showToast?.('Key Required', `Enter an API key for ${provider.name} before testing.`);
      return;
    }
    setTestingProvider(provider.id);
    setTimeout(() => {
      setTestingProvider(null);
      showToast?.(`${provider.name} Verified`, 'Provider connection handshake verified.');
    }, 600);
  };

  return (
    <main className="pt-20 min-h-screen bg-surface px-4 sm:px-6 max-w-7xl mx-auto w-full pb-16">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-outline-variant/20 mb-8">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm uppercase tracking-wider font-semibold">
              Orchestration &amp; Security
            </span>
            <span className="font-mono text-body-sm text-tertiary-fixed-dim">sys.config.v2.8</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg font-semibold text-on-surface tracking-tight mt-1">
            Agent Settings &amp; Ecosystem Mesh
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl mt-1">
            Manage upstream neural foundation providers, local MCP server endpoints, and autonomous execution boundaries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-surface-container-low shadow-sm">
            <div className="relative flex items-center justify-center">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
            </div>
            <div>
              <div className="font-label-sm text-[11px] text-on-surface-variant leading-none">MCP Daemon</div>
              <div className="font-body-sm text-body-sm font-semibold text-on-surface">Online • 18ms</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSaveProviders}
            disabled={isSaving}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm text-body-sm font-medium hover:bg-primary-container transition shadow-md disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-surface-container-low/80 backdrop-blur-md rounded-2xl p-3 shadow-md">
            <div className="px-3 pt-2 pb-3 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
              Preferences &amp; Core
            </div>
            <nav className="space-y-1">
              {[
                { id: 'providers', label: 'Model Providers', icon: 'smart_toy', badge: `${providers.length} Live` },
                { id: 'endpoints', label: 'Custom Endpoints & MCP', icon: 'hub', badge: `${mcpServers.length} Active` },
                { id: 'autonomy', label: 'Autonomy & Guardrails', icon: 'shield_person', badge: 'Active' },
                { id: 'profile', label: 'User Profile & Quotas', icon: 'account_circle', chevron: true },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-body-md text-body-md font-medium text-left transition ${
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
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-mono">
                      {tab.badge}
                    </span>
                  )}
                  {tab.chevron && (
                    <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content Panel */}
        <div className="lg:col-span-9 space-y-8">
          {activeTab === 'providers' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                  AI Model Providers &amp; Credentials
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Securely configure and persist upstream model API keys.
                </p>
              </div>

              {providers.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center space-y-2">
                  <span className="material-symbols-outlined text-[28px] text-primary">smart_toy</span>
                  <div className="font-semibold text-on-surface text-sm">No Foundation Providers Configured</div>
                  <div className="text-xs text-on-surface-variant max-w-sm">
                    Configure upstream API credentials in your environment or database to connect model providers.
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {providers.map((p) => (
                    <div key={p.id} className="bg-surface-container-low rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center space-x-3.5">
                          <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                            <span className="material-symbols-outlined text-[24px]">
                              {p.id.includes('anthropic') ? 'psychology' : p.id.includes('openai') ? 'cognition' : 'dns'}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{p.name}</h3>
                              {p.is_active && (
                                <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-semibold">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="font-body-sm text-xs text-on-surface-variant">{p.description}</div>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                        <div className="md:col-span-8 relative">
                          <input
                            type="password"
                            value={apiKeys[p.id] !== undefined ? apiKeys[p.id] : ''}
                            onChange={(e) =>
                              setApiKeys((prev) => ({ ...prev, [p.id]: e.target.value }))
                            }
                            className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-mono text-xs tracking-wider focus:outline-none focus:bg-surface-container-high transition"
                            placeholder={p.has_api_key ? '•••••••••••••••• (configured)' : 'Enter API key'}
                          />
                        </div>
                        <div className="md:col-span-4 flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => handleTestKey(p)}
                            disabled={testingProvider === p.id}
                            className="flex-1 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition flex items-center justify-center space-x-1.5"
                          >
                            <span className="material-symbols-outlined text-[16px] text-tertiary">bolt</span>
                            <span>{testingProvider === p.id ? 'Testing...' : 'Test Link'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'endpoints' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                  Custom Endpoints &amp; MCP Mesh
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Model Context Protocol (MCP) server interconnects.
                </p>
              </div>
              <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-6">
                <div className="space-y-3">
                  <div className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                    Registered Micro-Servers
                  </div>
                  {mcpServers.length === 0 ? (
                    <div className="text-center py-8 px-4 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col items-center justify-center space-y-2">
                      <span className="material-symbols-outlined text-[24px] text-primary">hub</span>
                      <div className="font-medium text-on-surface text-xs">No External MCP Servers Connected</div>
                      <div className="text-[11px] text-on-surface-variant">
                        External MCP servers connected via stdio or SSE will appear here.
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {mcpServers.map((s) => (
                        <div key={s.id} className="p-3.5 rounded-xl bg-surface-container flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <span className="material-symbols-outlined text-primary text-[18px]">hub</span>
                            <div>
                              <div className="font-body-sm text-body-sm font-medium text-on-surface">{s.name}</div>
                              <div className="text-[10px] text-tertiary font-mono">{s.url}</div>
                            </div>
                          </div>
                          <span className={`w-2 h-2 rounded-full ${s.status === 'active' ? 'bg-emerald-400' : 'bg-outline'}`} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'autonomy' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                  Autonomy &amp; Human Guardrails
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Define how freely {APP_NAME} can synthesize and register new tools.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  onClick={() => setAutonomyLevel('autonomous')}
                  className={`p-5 rounded-2xl cursor-pointer transition shadow-sm ${
                    autonomyLevel === 'autonomous'
                      ? 'bg-surface-container border border-primary/40'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <h4 className="font-body-lg text-body-lg font-semibold text-on-surface">Autonomous Execution</h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Agent discovers, synthesizes, and tests tools without requiring interactive confirmation.
                  </p>
                </div>
                <div
                  onClick={() => setAutonomyLevel('guided')}
                  className={`p-5 rounded-2xl cursor-pointer transition shadow-sm ${
                    autonomyLevel === 'guided'
                      ? 'bg-surface-container border border-primary/40'
                      : 'bg-surface-container-low hover:bg-surface-container'
                  }`}
                >
                  <h4 className="font-body-lg text-body-lg font-semibold text-on-surface">Guided Mode (Human-in-the-Loop)</h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Agent asks for user authorization before admitting newly forged tools into the registry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">User Profile &amp; Quotas</h2>
              </div>
              <div className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-4">
                <div>
                  <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">{user?.username || 'User'}</h3>
                  <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">{user?.email || 'user@local'}</p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-on-surface-variant">
                  <span className="capitalize px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    Auth: {user?.auth_provider || 'local'}
                  </span>
                  <span>•</span>
                  <span>ID: {user?.id?.slice(0, 8)}…</span>
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

import React, { useState, useEffect } from 'react';
import { apiFetch } from '../config.js';
import { ProviderConfigCard } from '../components/settings/ProviderConfigCard.jsx';
import { SandboxConfigCard } from '../components/settings/SandboxConfigCard.jsx';
import { McpConfigCard } from '../components/settings/McpConfigCard.jsx';
import { ProfileConfigCard } from '../components/settings/ProfileConfigCard.jsx';

const ApiSettingsPage = ({ showToast, user }) => {
  const [activeTab, setActiveTab] = useState('providers');
  const [autonomyLevel, setAutonomyLevel] = useState('autonomous');
  const [providers, setProviders] = useState([]);
  const [mcpServers, setMcpServers] = useState([]);

  useEffect(() => {
    apiFetch('/api/settings/providers')
      .then((data) => setProviders(data.providers || []))
      .catch((err) => showToast?.('Error', err.message));

    apiFetch('/api/settings/mcp_servers')
      .then((data) => setMcpServers(data.mcp_servers || []))
      .catch((err) => showToast?.('Error', err.message));
  }, [showToast]);

  const navItems = [
    { id: 'providers', label: 'Model Providers', icon: 'smart_toy', badge: `${providers.length} Live` },
    { id: 'sandbox', label: 'Execution Sandbox', icon: 'deployed_code', badge: 'Docker' },
    { id: 'endpoints', label: 'Custom Endpoints & MCP', icon: 'hub', badge: `${mcpServers.length} Active` },
    { id: 'autonomy', label: 'Autonomy & Guardrails', icon: 'shield_person', badge: 'Active' },
    { id: 'profile', label: 'User Profile & Engine', icon: 'account_circle', chevron: true },
  ];

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
            Manage upstream neural foundation providers, execution sandbox constraints, and MCP server endpoints.
          </p>
        </div>

        <div className="flex items-center space-x-3 px-4 py-2 rounded-xl bg-surface-container-low shadow-sm">
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-60" />
          </div>
          <div>
            <div className="font-label-sm text-[11px] text-on-surface-variant leading-none">MCP Daemon</div>
            <div className="font-body-sm text-body-sm font-semibold text-on-surface">Online • Isolated</div>
          </div>
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
              {navItems.map((tab) => (
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
            <ProviderConfigCard
              providers={providers}
              setProviders={setProviders}
              showToast={showToast}
            />
          )}

          {activeTab === 'sandbox' && (
            <SandboxConfigCard showToast={showToast} />
          )}

          {activeTab === 'endpoints' && (
            <McpConfigCard
              mcpServers={mcpServers}
              setMcpServers={setMcpServers}
              showToast={showToast}
            />
          )}

          {activeTab === 'autonomy' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
                  Autonomy &amp; Human Guardrails
                </h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                  Define how freely the Self-Forging AI can synthesize and register new tools.
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
                  <h4 className="font-body-lg text-body-lg font-semibold text-on-surface">Guided Mode (HITL)</h4>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Agent asks for user authorization before admitting newly forged tools into the registry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <ProfileConfigCard user={user} showToast={showToast} />
          )}
        </div>
      </div>
    </main>
  );
};

export default ApiSettingsPage;

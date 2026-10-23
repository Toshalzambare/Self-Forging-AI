import React, { useState } from 'react';
import { apiFetch } from '../../config.js';

export const ProviderConfigCard = ({ providers, setProviders, showToast }) => {
  const [apiKeys, setApiKeys] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [testingId, setTestingId] = useState(null);

  const getProviderIcon = (id = '') => {
    if (id.includes('anthropic')) return 'psychology';
    if (id.includes('openai')) return 'cognition';
    if (id.includes('ollama')) return 'memory';
    if (id.includes('omniroute')) return 'alt_route';
    if (id.includes('deepseek')) return 'neurology';
    if (id.includes('groq')) return 'speed';
    return 'smart_toy';
  };

  const handleSaveKey = async (providerId) => {
    const key = apiKeys[providerId];
    if (key === undefined || key.trim() === '') {
      showToast?.('Key Required', 'Please enter a valid API key.');
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch(`/api/settings/providers/${providerId}`, {
        method: 'PATCH',
        body: JSON.stringify({ api_key: key.trim() }),
      });
      showToast?.('Key Saved', `Updated API key for ${providerId}`);
      const refreshed = await apiFetch('/api/settings/providers');
      setProviders(refreshed.providers || []);
      setApiKeys((prev) => ({ ...prev, [providerId]: '' }));
    } catch (err) {
      showToast?.('Save Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (provider) => {
    try {
      await apiFetch(`/api/settings/providers/${provider.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !provider.is_active }),
      });
      showToast?.('Provider Updated', `${provider.name} is now ${!provider.is_active ? 'active' : 'inactive'}`);
      const refreshed = await apiFetch('/api/settings/providers');
      setProviders(refreshed.providers || []);
    } catch (err) {
      showToast?.('Update Failed', err.message);
    }
  };

  const handleTestKeyFormat = (provider) => {
    const key = apiKeys[provider.id] || (provider.has_api_key ? 'configured' : '');
    if (!key) {
      showToast?.('Key Required', `Enter an API key for ${provider.name} before validation.`);
      return;
    }
    setTestingId(provider.id);
    setTimeout(() => {
      setTestingId(null);
      showToast?.('Key Present', `${provider.name} has an API key configured. Live connectivity was not tested.`);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
          AI Model Providers &amp; Credentials
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Configure upstream LLM foundation endpoints, API keys, and model activation toggles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {providers.map((p) => (
          <div key={p.id} className="bg-surface-container-low rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-[24px]">{getProviderIcon(p.id)}</span>
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-body-lg text-body-lg font-semibold text-on-surface">{p.name}</h3>
                    <span
                      onClick={() => handleToggleActive(p)}
                      className={`cursor-pointer px-2 py-0.5 rounded-full text-[11px] font-semibold transition ${
                        p.is_active
                          ? 'bg-primary/15 text-primary hover:bg-primary/25'
                          : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
                      }`}
                    >
                      {p.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <div className="font-body-sm text-xs text-on-surface-variant">{p.description}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-7">
                <input
                  type="password"
                  value={apiKeys[p.id] !== undefined ? apiKeys[p.id] : ''}
                  onChange={(e) => setApiKeys((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-mono text-xs tracking-wider focus:outline-none focus:bg-surface-container-high transition"
                  placeholder={p.has_api_key ? '•••••••••••••••• (configured)' : 'Enter API key'}
                />
              </div>
              <div className="md:col-span-5 flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => handleTestKeyFormat(p)}
                  disabled={testingId === p.id}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition flex items-center justify-center space-x-1"
                >
                  <span className="material-symbols-outlined text-[16px] text-tertiary">bolt</span>
                  <span>{testingId === p.id ? 'Checking...' : 'Check'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveKey(p.id)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-medium hover:bg-primary-container transition flex items-center space-x-1 disabled:opacity-50"
                >
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

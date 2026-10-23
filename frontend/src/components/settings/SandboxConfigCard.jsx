import React, { useState, useEffect } from 'react';
import { apiFetch } from '../../config.js';

export const SandboxConfigCard = ({ showToast }) => {
  const [sandbox, setSandbox] = useState({
    image: 'sfa-sandbox:latest',
    memory_limit: '512m',
    timeout_seconds: 60,
    network_mode: 'none',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    apiFetch('/api/settings/sandbox')
      .then((data) => {
        if (data.sandbox) setSandbox(data.sandbox);
      })
      .catch((err) => showToast?.('Sandbox Load Error', err.message));
  }, [showToast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await apiFetch('/api/settings/sandbox', {
        method: 'PATCH',
        body: JSON.stringify(sandbox),
      });
      if (res.sandbox) setSandbox(res.sandbox);
      showToast?.('Sandbox Updated', 'Execution constraints updated successfully.');
    } catch (err) {
      showToast?.('Update Failed', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
          Execution Sandbox Constraints
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Tune runtime containment boundaries for adversarial testing and tool validation.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-surface-container-low rounded-2xl p-6 shadow-sm space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant tracking-wider mb-2">
              Docker Image Tag
            </label>
            <input
              type="text"
              value={sandbox.image}
              onChange={(e) => setSandbox({ ...sandbox, image: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-mono text-xs focus:outline-none focus:bg-surface-container-high transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant tracking-wider mb-2">
              Memory Limit
            </label>
            <select
              value={sandbox.memory_limit}
              onChange={(e) => setSandbox({ ...sandbox, memory_limit: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs focus:outline-none focus:bg-surface-container-high transition"
            >
              <option value="256m">256 MB (Strict Minimum)</option>
              <option value="512m">512 MB (Recommended)</option>
              <option value="1024m">1024 MB (Compute Heavy)</option>
              <option value="2048m">2048 MB (Expanded Data/ML)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant tracking-wider mb-2">
              Execution Timeout ({sandbox.timeout_seconds}s)
            </label>
            <input
              type="range"
              min="5"
              max="60"
              step="5"
              value={sandbox.timeout_seconds}
              onChange={(e) => setSandbox({ ...sandbox, timeout_seconds: parseInt(e.target.value, 10) })}
              className="w-full accent-primary cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-on-surface-variant mt-1 font-mono">
              <span>5s</span>
              <span>30s</span>
              <span>60s</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-on-surface-variant tracking-wider mb-2">
              Network Isolation Mode
            </label>
            <select
              value={sandbox.network_mode}
              onChange={(e) => setSandbox({ ...sandbox, network_mode: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs focus:outline-none focus:bg-surface-container-high transition"
            >
              <option value="none">none (Air-gapped / Full Isolation)</option>
              <option value="bridge">bridge (Local Docker Subnet)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-outline-variant/20">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-body-sm text-xs font-medium hover:bg-primary-container transition shadow-md disabled:opacity-50 flex items-center space-x-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">save</span>
            <span>{isSaving ? 'Saving...' : 'Apply Sandbox Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

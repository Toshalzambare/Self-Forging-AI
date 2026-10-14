import React, { useState } from 'react';
import { apiFetch } from '../../config.js';

export const McpConfigCard = ({ mcpServers, setMcpServers, showToast }) => {
  const [newName, setNewName] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [testingId, setTestingId] = useState(null);
  const [testResults, setTestResults] = useState({});

  const handleAddServer = async (e) => {
    e.preventDefault();
    if (!newName.trim() || !newUrl.trim()) return;
    setIsAdding(true);
    try {
      const res = await apiFetch('/api/settings/mcp_servers', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim(), url: newUrl.trim() }),
      });
      if (res.mcp_server) {
        setMcpServers((prev) => [...prev, res.mcp_server]);
        setNewName('');
        setNewUrl('');
        showToast?.('Server Added', `Configured MCP server ${res.mcp_server.name}`);
      }
    } catch (err) {
      showToast?.('Add Failed', err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteServer = async (serverId) => {
    try {
      await apiFetch(`/api/settings/mcp_servers/${serverId}`, { method: 'DELETE' });
      setMcpServers((prev) => prev.filter((s) => s.id !== serverId));
      showToast?.('Server Removed', 'MCP server removed from mesh configuration.');
    } catch (err) {
      showToast?.('Delete Failed', err.message);
    }
  };

  const handleTestPing = async (server) => {
    setTestingId(server.id);
    try {
      const res = await apiFetch('/api/settings/mcp_servers/test', {
        method: 'POST',
        body: JSON.stringify({ url: server.url }),
      });
      setTestResults((prev) => ({ ...prev, [server.id]: res }));
      showToast?.('Ping Result', res.message);
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [server.id]: { status: 'offline', latency_ms: 0, message: err.message },
      }));
      showToast?.('Ping Failed', err.message);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-md text-headline-md font-semibold text-on-surface">
          Custom Endpoints &amp; MCP Mesh
        </h2>
        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
          Federate external Model Context Protocol (MCP) server endpoints with live connectivity checks.
        </p>
      </div>

      {/* Add New Server Form */}
      <form onSubmit={handleAddServer} className="bg-surface-container-low rounded-2xl p-5 shadow-sm space-y-4">
        <div className="font-label-sm text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
          Register New External MCP Server
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5">
            <input
              type="text"
              placeholder="Server Name (e.g., Brave Search MCP)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface text-xs focus:outline-none focus:bg-surface-container-high transition"
              required
            />
          </div>
          <div className="md:col-span-5">
            <input
              type="text"
              placeholder="URL / Host (e.g., http://localhost:8080/sse)"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface font-mono text-xs focus:outline-none focus:bg-surface-container-high transition"
              required
            />
          </div>
          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isAdding}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-medium hover:bg-primary-container transition flex items-center justify-center space-x-1 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>{isAdding ? 'Adding...' : 'Add'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Servers List */}
      <div className="space-y-3">
        <div className="font-label-sm text-xs font-semibold uppercase text-on-surface-variant tracking-wider">
          Active MCP Servers ({mcpServers.length})
        </div>
        {mcpServers.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-col items-center justify-center space-y-2">
            <span className="material-symbols-outlined text-[24px] text-primary">hub</span>
            <div className="font-medium text-on-surface text-xs">No External MCP Servers Connected</div>
            <div className="text-[11px] text-on-surface-variant">Add an MCP endpoint above to federate tools.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {mcpServers.map((s) => {
              const ping = testResults[s.id];
              return (
                <div key={s.id} className="p-4 rounded-2xl bg-surface-container-low shadow-sm flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[20px]">hub</span>
                    </div>
                    <div>
                      <div className="font-body-md text-sm font-semibold text-on-surface">{s.name}</div>
                      <div className="text-xs text-tertiary font-mono">{s.url}</div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {ping && (
                      <span
                        className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-medium ${
                          ping.status === 'online'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {ping.status === 'online' ? `Online • ${ping.latency_ms}ms` : 'Unreachable'}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleTestPing(s)}
                      disabled={testingId === s.id}
                      className="px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium transition flex items-center space-x-1"
                    >
                      <span className="material-symbols-outlined text-[15px] text-tertiary">sensors</span>
                      <span>{testingId === s.id ? 'Pinging...' : 'Ping'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteServer(s.id)}
                      className="w-8 h-8 rounded-xl hover:bg-error/15 text-outline hover:text-error transition flex items-center justify-center"
                      title="Delete server"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

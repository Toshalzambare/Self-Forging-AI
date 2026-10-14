import React, { useState, useEffect, useMemo } from 'react';
import { apiFetch, APP_NAME } from '../config.js';
import ToolCard from '../components/tools/ToolCard.jsx';
import ToolDetailModal from '../components/tools/ToolDetailModal.jsx';
import ImportToolModal from '../components/tools/ImportToolModal.jsx';

/**
 * EcosystemToolsPage:
 * Modern glassmorphic catalog displaying the authenticated user's forged tools,
 * real-time Dual-Gate metrics, active/inactive toggles, inspection modals,
 * and portable .sfatool export and import workflows.
 */
const EcosystemToolsPage = ({ showToast }) => {
  const [allTools, setAllTools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testingTool, setTestingTool] = useState(null);

  const [inspectingTool, setInspectingTool] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fetchTools = async () => {
    try {
      const data = await apiFetch('/api/tools');
      setAllTools(data.tools || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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

  const handleToggleStatus = async (toolId, newStatus) => {
    try {
      await apiFetch(`/api/tools/${toolId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      setAllTools((prev) =>
        prev.map((t) => (t.id === toolId ? { ...t, status: newStatus } : t))
      );
      showToast('Status Updated', `Tool status changed to ${newStatus}.`);
    } catch (err) {
      showToast('Update Failed', err.message);
    }
  };

  const handleDelete = async (toolId, toolName) => {
    if (!window.confirm(`Are you sure you want to permanently delete tool '${toolName}'?`)) {
      return;
    }
    try {
      await apiFetch(`/api/tools/${toolId}`, { method: 'DELETE' });
      setAllTools((prev) => prev.filter((t) => t.id !== toolId));
      showToast('Tool Deleted', `Permanently deleted tool '${toolName}'.`);
    } catch (err) {
      showToast('Delete Failed', err.message);
    }
  };

  const handleExport = async (tool) => {
    try {
      const res = await apiFetch(`/api/tools/${tool.id}/export`);
      const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${tool.name}.sfatool`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Tool Exported', `Downloaded ${tool.name}.sfatool.`);
    } catch (err) {
      showToast('Export Failed', err.message);
    }
  };

  const stats = useMemo(() => {
    const total = allTools.length;
    const active = allTools.filter((t) => t.status === 'active').length;
    const totalReuses = allTools.reduce((acc, t) => acc + (t.reuse_count || 0), 0);
    const avgGate =
      total > 0
        ? Math.round((allTools.reduce((acc, t) => acc + (t.gate_score || 0), 0) / total) * 100)
        : 100;
    return { total, active, totalReuses, avgGate };
  }, [allTools]);

  const filteredTools = useMemo(() => {
    return allTools.filter((t) => {
      const matchesStatus = filterStatus === 'all' || t.status?.toLowerCase() === filterStatus;
      const matchesQuery =
        (t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [allTools, filterStatus, searchQuery]);

  return (
    <main className="pt-20 min-h-screen bg-surface px-4 md:px-12 py-6 max-w-7xl mx-auto w-full">
      <div className="space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low p-6 sm:p-8 shadow-xl border border-outline-variant/20">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-2">
              <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
                Tool Registry &amp; Ecosystem
              </h1>
              <p className="font-body-lg text-xs sm:text-sm text-on-surface-variant leading-relaxed">
                {APP_NAME} autonomously synthesizes, sandboxes, and verifies custom tools. Manage your personal tool namespace, inspect code and input schemas, and export or import portable <strong className="text-on-surface">.sfatool</strong> packages.
              </p>
            </div>

            {/* Stats Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm text-center">
                <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Total Tools</div>
                <div className="mt-1 text-xl font-bold text-on-surface">{stats.total}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm text-center">
                <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Active</div>
                <div className="mt-1 text-xl font-bold text-emerald-400">{stats.active}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm text-center">
                <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Avg Gate</div>
                <div className="mt-1 text-xl font-bold text-primary">{stats.avgGate}%</div>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 shadow-sm text-center">
                <div className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider">Total Reuses</div>
                <div className="mt-1 text-xl font-bold text-secondary">{stats.totalReuses}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar: Search, Filters & Import Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface placeholder:text-outline text-xs focus:outline-none focus:bg-surface-container border border-outline-variant/30 shadow-inner transition-colors"
              placeholder="Search tools, schemas, and descriptions..."
              type="text"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter Tabs */}
            <div className="flex items-center space-x-1 p-1 bg-surface-container-low rounded-xl border border-outline-variant/20">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'degraded', label: 'Degraded' },
                { id: 'quarantined', label: 'Quarantined' },
                { id: 'inactive', label: 'Inactive' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    filterStatus === tab.id
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Import .sfatool Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-primary-container/25 text-primary border border-primary/30 hover:bg-primary-container/40 text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">upload</span>
              <span>Import .sfatool</span>
            </button>
          </div>
        </div>

        {/* Main Catalog Grid */}
        {loading ? (
          <div className="text-center py-20 font-mono text-on-surface-variant flex flex-col items-center justify-center space-y-2">
            <span className="material-symbols-outlined text-[32px] animate-spin text-primary">sync</span>
            <span className="text-xs">Loading tool registry...</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-error text-xs font-mono">Error: {error}</div>
        ) : filteredTools.length === 0 ? (
          <div className="text-center py-16 px-4 rounded-2xl bg-surface-container-low border border-outline-variant/20 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary-container/20 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[28px]">extension_off</span>
            </div>
            <h3 className="font-semibold text-on-surface text-sm">No Tools Found</h3>
            <p className="text-xs text-on-surface-variant max-w-md">
              No tools matched your search or status filter. Ask the agent to forge a new tool in the Conversation view, or click "Import .sfatool" to import an existing package.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-12">
            {filteredTools.map((tool) => (
              <ToolCard
                key={tool.id}
                tool={tool}
                onInspect={(t) => setInspectingTool(t)}
                onTest={handleTest}
                onExport={handleExport}
                onToggleStatus={handleToggleStatus}
                onDelete={handleDelete}
                testingTool={testingTool}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inspect Modal */}
      {inspectingTool && (
        <ToolDetailModal
          tool={inspectingTool}
          onClose={() => setInspectingTool(null)}
          onExport={handleExport}
          showToast={showToast}
        />
      )}

      {/* Import Modal */}
      <ImportToolModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchTools}
        showToast={showToast}
      />
    </main>
  );
};

export default EcosystemToolsPage;

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

const ActivityDrawer = ({ isOpen, onClose, showToast }) => {
      const [filter, setFilter] = useState('all');
      if (!isOpen) return null;

      return (
        <aside className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-surface-container-low border-l border-outline-variant/30 shadow-2xl z-50 flex flex-col">
          {/* Drawer Header */}
          <div className="p-4 border-b border-outline-variant/20 flex items-center justify-between bg-surface-container">
            <div className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-[18px] text-primary">browse_activity</span>
              <span className="text-body-md font-semibold text-on-surface">Agent Activity Feed</span>
            </div>
            <button
              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              onClick={onClose}
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Feed Category Tabs */}
          <div className="px-4 py-2 border-b border-outline-variant/20 flex items-center space-x-2 text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md ${filter === 'all' ? 'bg-primary-container/20 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              All Activities
            </button>
            <button
              onClick={() => setFilter('tools')}
              className={`px-2.5 py-1 rounded-md ${filter === 'tools' ? 'bg-primary-container/20 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              Tool Calls
            </button>
            <button
              onClick={() => setFilter('system')}
              className={`px-2.5 py-1 rounded-md ${filter === 'system' ? 'bg-primary-container/20 text-primary font-medium' : 'text-on-surface-variant hover:text-on-surface'}`}
            >
              System
            </button>
          </div>

          {/* Activity Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-xs space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-primary font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  Tool Execution
                </span>
                <span className="text-outline">10:14:52 AM</span>
              </div>
              <p className="text-on-surface font-medium">Web Crawler queried Reuters and Yahoo Finance</p>
              <span className="text-[11px] text-on-surface-variant font-mono">Status: 200 OK • 12 sources parsed</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-xs space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-secondary font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Autonomous Tool Synthesis
                </span>
                <span className="text-outline">10:15:04 AM</span>
              </div>
              <p className="text-on-surface font-medium">Created tool `NotionDigestSync`</p>
              <span className="text-[11px] text-on-surface-variant font-mono">Passed automated mock validation</span>
            </div>

            <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/20 text-xs space-y-1">
              <div className="flex items-center justify-between text-on-surface-variant">
                <span className="text-tertiary font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                  Workspace Sync
                </span>
                <span className="text-outline">10:15:10 AM</span>
              </div>
              <p className="text-on-surface font-medium">Drafting Notion Database Card</p>
              <span className="text-[11px] text-on-surface-variant font-mono">DB: Market-Intelligence-2025</span>
            </div>
          </div>

          {/* Activity Footer */}
          <div className="p-3 bg-surface-container border-t border-outline-variant/20 flex items-center justify-between text-xs text-on-surface-variant">
            <span>Auto-refresh enabled</span>
            <button
              onClick={() => showToast('Report Downloaded', 'Audit trail exported as JSON.')}
              className="text-primary hover:underline"
            >
              Download Report
            </button>
          </div>
        </aside>
      );
    };

export default ActivityDrawer;

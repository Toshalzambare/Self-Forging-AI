import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { APP_NAME } from '../config.js';

const Header = ({ onOpenModelModal, onOpenSettingsModal, onToggleLogsDrawer, selectedModel, user, onLogout }) => {
      const location = useLocation();
      const currentPath = location.pathname;

      const navLinks = [
        { path: '/', label: 'Conversation', icon: 'forum' },
        { path: '/ecosystem-tools', label: 'Ecosystem & Tools', icon: 'extension' },
        { path: '/activity-logs', label: 'Activity & Logs', icon: 'browse_activity' },
        { path: '/api-settings', label: 'API & Settings', icon: 'tune' }
      ];

      return (
        <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/90 border-b border-outline-variant/30 backdrop-blur-md h-16">
          <div className="flex items-center justify-between px-3 sm:px-6 h-full max-w-7xl mx-auto w-full gap-2">
            {/* Companion Identity */}
            <div className="flex items-center space-x-3 sm:space-x-5 flex-shrink-0">
              <Link to="/" className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group no-underline text-inherit">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary-container/30 transition-all shadow-sm flex-shrink-0">
                  <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-primary material-symbols-fill">auto_awesome</span>
                </div>
                <div className="flex flex-col justify-center">
                  <div className="flex items-center space-x-2">
                    <span className="font-headline-sm text-[16px] sm:text-headline-sm font-semibold tracking-tight text-on-surface">{APP_NAME}</span>
                    <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full bg-primary-container/15 text-primary font-label-sm text-label-sm border border-primary/20">AI Agent</span>
                  </div>
                  <p className="hidden md:block font-label-sm text-[11px] text-on-surface-variant font-normal leading-tight truncate">Self-Forging · Tool Generation · Sandbox Testing</p>
                </div>
              </Link>

              {/* Navigation Tabs */}
              <nav className="hidden lg:flex items-center pl-3 lg:pl-5 border-l border-outline-variant/30 space-x-1 sm:space-x-1.5 flex-shrink-0">
                {navLinks.map(link => {
                  const isActive = (currentPath === link.path) || (link.path === '/' && currentPath === '');
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl font-body-md text-[13px] sm:text-body-md font-medium transition-all duration-150 flex items-center space-x-1.5 sm:space-x-2 no-underline ${
                        isActive
                          ? 'bg-surface-container-high text-primary border border-outline-variant/40 shadow-sm'
                          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px] sm:text-[17px]">{link.icon}</span>
                      <span className="hidden xl:inline">{link.label}</span>
                      {link.count && (
                        <span className="hidden xl:inline text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container-highest text-secondary">
                          {link.count}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Right Header Indicators & Actions */}
            <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
              {/* Quick Model Switcher Trigger */}
              <button
                onClick={onOpenModelModal}
                className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface font-body-sm text-body-sm transition-colors shadow-sm"
                title="Switch active intelligence model"
              >
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 flex-shrink-0"></span>
                <span className="font-medium text-xs sm:text-sm hidden sm:inline-block max-w-[80px] md:max-w-[120px] truncate">{selectedModel}</span>
                <span className="font-label-sm text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20 hidden md:inline">Auto</span>
                <span className="material-symbols-outlined text-[14px] sm:text-[16px] text-outline">unfold_more</span>
              </button>

              {/* Ecosystem Tools Link */}
              <Link
                to="/ecosystem-tools"
                className="hidden 2xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 text-on-surface-variant font-body-sm text-body-sm transition-colors no-underline"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">hub</span>
                <span className="text-on-surface font-medium">Tools Registry</span>
              </Link>

              {/* Activity Feed Quick Toggle */}
              <button
                onClick={onToggleLogsDrawer}
                className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-on-surface text-body-sm transition-colors shadow-sm"
                title="Open live activity side panel"
              >
                <span className="material-symbols-outlined text-[15px] sm:text-[17px] text-secondary">sync_alt</span>
                <span className="hidden md:inline w-1.5 h-1.5 rounded-full bg-secondary"></span>
              </button>

              {/* User Profile + Logout */}
              <div className="flex items-center space-x-1 pl-1 sm:pl-2 border-l border-outline-variant/30">
                <Link
                  to="/api-settings"
                  className="flex items-center space-x-2 py-1 px-1.5 sm:px-2.5 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 transition-colors no-underline"
                >
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-container/30 border border-primary/40 flex items-center justify-center text-primary text-[10px] sm:text-xs font-semibold flex-shrink-0 uppercase">
                    {user?.username?.slice(0, 2) || 'U'}
                  </div>
                  <div className="hidden xl:flex flex-col text-left">
                    <span className="text-xs font-medium text-on-surface leading-tight">{user?.username || 'User'}</span>
                    <span className="text-[10px] text-emerald-400 leading-tight font-medium">Online</span>
                  </div>
                </Link>
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Sign out"
                >
                  <span className="material-symbols-outlined text-[17px]">logout</span>
                </button>
              </div>
            </div>
          </div>
        </header>
      );
    };

export default Header;

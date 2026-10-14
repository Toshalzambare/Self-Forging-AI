import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { APP_NAME } from '../config.js';

const Header = ({ onOpenModelModal, onToggleLogsDrawer, selectedModel, user, onLogout }) => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { path: '/', label: 'Conversation', icon: 'forum' },
    { path: '/ecosystem-tools', label: 'Ecosystem & Tools', icon: 'extension' },
    { path: '/activity-logs', label: 'Activity & Logs', icon: 'browse_activity' },
    { path: '/api-settings', label: 'API & Settings', icon: 'tune' },
  ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface-container-lowest/90 border-b border-outline-variant/30 backdrop-blur-md h-16">
        <div className="flex items-center justify-between px-3 sm:px-6 h-full max-w-7xl mx-auto w-full gap-2">
          {/* Brand Identity */}
          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {/* Mobile Nav Toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition"
              title="Toggle mobile menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            <Link to="/" className="flex items-center space-x-2 sm:space-x-3 cursor-pointer group no-underline text-inherit">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary-container/20 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary-container/30 transition-all shadow-sm flex-shrink-0">
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] text-primary material-symbols-fill">auto_awesome</span>
              </div>
              <div className="flex flex-col justify-center">
                <div className="flex items-center space-x-2">
                  <span className="font-headline-sm text-[15px] sm:text-headline-sm font-semibold tracking-tight text-on-surface truncate max-w-[120px] sm:max-w-none">
                    {APP_NAME}
                  </span>
                  <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full bg-primary-container/15 text-primary text-[10px] font-semibold border border-primary/20">
                    AI Agent
                  </span>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden lg:flex items-center pl-3 lg:pl-5 border-l border-outline-variant/30 space-x-1 sm:space-x-1.5 flex-shrink-0">
              {navLinks.map((link) => {
                const isActive = currentPath === link.path || (link.path === '/' && currentPath === '');
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center space-x-1.5 no-underline ${
                      isActive
                        ? 'bg-surface-container-high text-primary border border-outline-variant/40 shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px] sm:text-[17px]">{link.icon}</span>
                    <span className="hidden xl:inline">{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center space-x-1.5 sm:space-x-3 flex-shrink-0">
            {/* Model Selector Button */}
            <button
              type="button"
              onClick={onOpenModelModal}
              className="flex items-center space-x-1.5 px-2 sm:px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface text-xs transition-colors shadow-sm"
              title="Switch model"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="font-medium hidden sm:inline max-w-[90px] truncate">{selectedModel}</span>
              <span className="material-symbols-outlined text-[14px] text-outline">unfold_more</span>
            </button>

            {/* Live Activity Drawer Toggle */}
            <button
              type="button"
              onClick={onToggleLogsDrawer}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-on-surface-variant hover:text-on-surface text-xs transition-colors shadow-sm flex items-center space-x-1"
              title="Open activity drawer"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">browse_activity</span>
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center space-x-1 pl-1 sm:pl-2 border-l border-outline-variant/30">
              <Link
                to="/api-settings"
                className="flex items-center space-x-1.5 py-1 px-1.5 sm:px-2 rounded-full bg-surface-container hover:bg-surface-container-high border border-outline-variant/25 transition-colors no-underline"
                title={`${user?.username || 'User'} (${user?.email || ''})`}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username}
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border border-primary/40 flex-shrink-0"
                  />
                ) : (
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary-container/30 border border-primary/40 flex items-center justify-center text-primary text-[10px] sm:text-xs font-semibold flex-shrink-0 uppercase">
                    {user?.username?.slice(0, 2) || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-on-surface hidden md:inline truncate max-w-[80px]">
                  {user?.username || 'User'}
                </span>
              </Link>

              <button
                type="button"
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

      {/* Mobile Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-16 z-30 lg:hidden bg-slate-950/95 border-b border-slate-800/80 backdrop-blur-xl p-3 shadow-2xl animate-fadeIn">
          <nav className="grid grid-cols-2 gap-2">
            {navLinks.map((link) => {
              const isActive = currentPath === link.path || (link.path === '/' && currentPath === '');
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`p-2.5 rounded-xl text-xs font-medium flex items-center space-x-2 transition no-underline ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-900/80 text-slate-300 hover:bg-slate-850'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
};

export default Header;
